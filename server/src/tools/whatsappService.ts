import { getDatabase, logActivity } from '../db/database.js';
import { resolveContact, Contact } from './contacts.js';
import { WHATSAPP_CONFIG } from '../config.js';
import crypto from 'crypto';

export interface WhatsAppMessageRecord {
  id: string;
  contact_id?: string;
  recipient_phone: string;
  recipient_name: string;
  message_text: string;
  template_name?: string;
  status: 'pending_approval' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'handoff_prepared';
  idempotency_key?: string;
  provider_message_id?: string;
  handoff_url?: string;
  delivery_details?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface PrepareWhatsAppResult {
  messageId: string;
  recipientName: string;
  recipientPhone: string;
  messageText: string;
  status: string;
  isApiConfigured: boolean;
  handoffUrl: string;
  requiresTemplate: boolean;
  eligibilityNote: string;
}

/**
 * Prepares a WhatsApp message by resolving the recipient from approved contacts,
 * evaluating Meta Cloud API eligibility/templates, and building a supported handoff fallback.
 */
export async function prepareWhatsAppMessage(
  recipientQuery: string,
  messageText: string,
  templateName?: string
): Promise<PrepareWhatsAppResult> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `wa-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  // 1. Resolve recipient from approved contacts
  let phone = recipientQuery.replace(/[^0-9+]/g, '');
  let name = recipientQuery;
  let contactId: string | undefined;

  if (!phone || phone.length < 7) {
    const resolution = resolveContact(recipientQuery);
    if (resolution.ambiguous) {
      const matchNames = resolution.matches?.map(m => `${m.name} (${m.phone || 'no phone'})`).join(', ');
      throw new Error(`Recipient ambiguity detected for "${recipientQuery}". Multiple contacts matched: ${matchNames}. Please select the exact recipient.`);
    }
    if (!resolution.resolved || !resolution.contact?.phone) {
      throw new Error(`Recipient "${recipientQuery}" was not found in approved contacts and no valid phone number was supplied.`);
    }
    phone = resolution.contact.phone;
    name = resolution.contact.name;
    contactId = resolution.contact.id;
  }

  // Format clean E.164 phone for WhatsApp wa.me
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  // Meta Cloud API configuration check
  const isApiConfigured = !!(WHATSAPP_CONFIG.phoneNumberId && WHATSAPP_CONFIG.accessToken);

  // Supported direct handoff link (works seamlessly for personal or business accounts)
  const encodedText = encodeURIComponent(messageText);
  const handoffUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  // Idempotency key for deduplication
  const idempotency_key = crypto
    .createHash('sha256')
    .update(`${cleanPhone}|${messageText}`)
    .digest('hex');

  // Meta 24-hour service window vs template rule
  const requiresTemplate = !templateName;
  const eligibilityNote = isApiConfigured
    ? "Meta Cloud API is connected. Business-initiated messages require user opt-in or an approved template outside the 24h window."
    : "WhatsApp Business API credentials not yet supplied. Message prepared with instant supported WhatsApp handoff (wa.me).";

  // Check if identical pending or sent message exists
  const existing = db.prepare('SELECT * FROM whatsapp_messages WHERE idempotency_key = ?').get(idempotency_key) as any;
  if (existing) {
    return {
      messageId: existing.id,
      recipientName: existing.recipient_name,
      recipientPhone: existing.recipient_phone,
      messageText: existing.message_text,
      status: existing.status,
      isApiConfigured,
      handoffUrl: existing.handoff_url || handoffUrl,
      requiresTemplate,
      eligibilityNote: "An identical WhatsApp message was already created (deduplicated)."
    };
  }

  db.prepare(`
    INSERT INTO whatsapp_messages (id, contact_id, recipient_phone, recipient_name, message_text, template_name, status, idempotency_key, handoff_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?, ?)
  `).run(id, contactId || null, phone, name, messageText, templateName || null, idempotency_key, handoffUrl, now, now);

  logActivity('whatsapp', 'prepare_message', { id, recipient: name, phone });

  return {
    messageId: id,
    recipientName: name,
    recipientPhone: phone,
    messageText,
    status: 'pending_approval',
    isApiConfigured,
    handoffUrl,
    requiresTemplate,
    eligibilityNote
  };
}

/**
 * Dispatches an approved WhatsApp message.
 * Enforces delivery status tracking: distinguishes 'accepted' from 'delivered'.
 */
export async function sendWhatsAppMessage(
  messageId: string
): Promise<{ success: boolean; status: string; providerMessageId?: string; handoffUrl?: string; deliveryStatus: string; note: string }> {
  const db = getDatabase();
  const msg = db.prepare('SELECT * FROM whatsapp_messages WHERE id = ?').get(messageId) as any;

  if (!msg) {
    throw new Error(`WhatsApp message ${messageId} not found.`);
  }

  const now = new Date().toISOString();
  const isApiConfigured = !!(WHATSAPP_CONFIG.phoneNumberId && WHATSAPP_CONFIG.accessToken);

  if (isApiConfigured) {
    try {
      // Execute Meta Cloud API HTTP request
      const url = `https://graph.facebook.com/${WHATSAPP_CONFIG.apiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`;
      const cleanPhone = msg.recipient_phone.replace(/[^0-9]/g, '');

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: msg.message_text }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Meta Cloud API rejected the message dispatch.');
      }

      const wamid = data?.messages?.[0]?.id || `wamid-${Date.now().toString(36)}`;

      // Notice: Meta acknowledges send request as 'accepted' or 'sent', NOT 'delivered'
      // 'delivered' is only known when webhook delivers delivery receipt
      db.prepare(`
        UPDATE whatsapp_messages
        SET status = 'accepted', provider_message_id = ?, updated_at = ?
        WHERE id = ?
      `).run(wamid, now, messageId);

      logActivity('whatsapp', 'meta_api_accepted', { messageId, wamid });

      return {
        success: true,
        status: 'accepted',
        providerMessageId: wamid,
        deliveryStatus: 'Accepted by WhatsApp Gateway (awaiting network carrier delivery receipt)',
        note: 'Message accepted by Meta Cloud API. Final delivery status depends on recipient device connectivity.'
      };
    } catch (err: any) {
      db.prepare("UPDATE whatsapp_messages SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
        .run(err.message, now, messageId);

      logActivity('whatsapp', 'meta_api_error', { messageId, error: err.message });
      throw err;
    }
  }

  // Safe Supported Handoff Mode: Credentials not configured
  db.prepare(`
    UPDATE whatsapp_messages
    SET status = 'handoff_prepared', updated_at = ?
    WHERE id = ?
  `).run(now, messageId);

  logActivity('whatsapp', 'handoff_prepared', { messageId, handoffUrl: msg.handoff_url });

  return {
    success: true,
    status: 'handoff_prepared',
    handoffUrl: msg.handoff_url,
    deliveryStatus: 'Ready for user transmission via WhatsApp handoff link',
    note: 'Message is packaged and ready. Click the provided WhatsApp handoff link to transmit directly to the recipient.'
  };
}

/**
 * Updates delivery status from webhook or simulated delivery event
 */
export function updateWhatsAppDeliveryStatus(providerMessageId: string, newStatus: 'sent' | 'delivered' | 'read' | 'failed') {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE whatsapp_messages
    SET status = ?, updated_at = ?
    WHERE provider_message_id = ?
  `).run(newStatus, now, providerMessageId);

  logActivity('whatsapp', 'delivery_status_updated', { providerMessageId, newStatus });
}

export function listWhatsAppMessages(status?: string): WhatsAppMessageRecord[] {
  const db = getDatabase();
  let q = 'SELECT * FROM whatsapp_messages';
  const params: any[] = [];
  if (status) {
    q += ' WHERE status = ?';
    params.push(status);
  }
  q += ' ORDER BY created_at DESC';
  return db.prepare(q).all(...params) as any[];
}
