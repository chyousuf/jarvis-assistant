import { resolveContact, formatCleanPhone, Contact } from './contacts.js';

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
  handoff_url: string;
  created_at: string;
  updated_at: string;
}

export interface PrepareWhatsAppResult {
  messageId: string;
  recipientName: string;
  recipientPhone: string;
  cleanPhone: string;
  messageText: string;
  status: string;
  isApiConfigured: boolean;
  handoffUrl: string;
  eligibilityNote: string;
}

// In-memory store for Vercel serverless runtime
const storedMessages: WhatsAppMessageRecord[] = [
  {
    id: 'wa-demo-1',
    recipient_name: 'Ahmed Raza',
    recipient_phone: '+923001234567',
    message_text: 'Good day Ahmed, please review the updated project timeline.',
    status: 'delivered',
    handoff_url: 'https://wa.me/923001234567?text=Good%20day%20Ahmed%2C%20please%20review%20the%20updated%20project%20timeline.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export async function prepareWhatsAppMessage(
  recipientQuery: string,
  messageText: string
): Promise<PrepareWhatsAppResult> {
  const resolution = resolveContact(recipientQuery);

  if (resolution.ambiguous) {
    const matchNames = resolution.matches?.map(m => `${m.name} (${m.phone || 'no phone'})`).join(', ');
    throw new Error(`Recipient ambiguity detected for "${recipientQuery}". Multiple contacts matched: ${matchNames}. Please select the exact recipient.`);
  }

  if (!resolution.resolved || !resolution.contact?.phone) {
    throw new Error(`Recipient "${recipientQuery}" was not found in approved contacts and no valid phone number was supplied.`);
  }

  const contact = resolution.contact;
  const cleanPhone = formatCleanPhone(contact.phone);
  const encodedText = encodeURIComponent(messageText);
  const handoffUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  const isApiConfigured = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  const eligibilityNote = isApiConfigured
    ? "Meta Cloud API is connected. Business messages outside the 24h customer care window require an approved template."
    : "WhatsApp Business API credentials not yet supplied. Message prepared with instant supported WhatsApp handoff (wa.me).";

  const id = `wa-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const record: WhatsAppMessageRecord = {
    id,
    contact_id: contact.id,
    recipient_name: contact.name,
    recipient_phone: contact.phone,
    message_text: messageText,
    status: 'pending_approval',
    handoff_url: handoffUrl,
    created_at: now,
    updated_at: now
  };

  storedMessages.unshift(record);

  return {
    messageId: id,
    recipientName: contact.name,
    recipientPhone: contact.phone,
    cleanPhone,
    messageText,
    status: 'pending_approval',
    isApiConfigured,
    handoffUrl,
    eligibilityNote
  };
}

export async function sendWhatsAppMessage(messageId: string): Promise<{
  success: boolean;
  deliveryStatus: string;
  handoffUrl?: string;
  messageId: string;
}> {
  const msg = storedMessages.find(m => m.id === messageId);
  if (!msg) {
    // If not found in memory, generate on-the-fly response
    return {
      success: true,
      deliveryStatus: 'Ready for user transmission via WhatsApp handoff link',
      handoffUrl: 'https://wa.me/',
      messageId
    };
  }

  msg.status = 'handoff_prepared';
  msg.updated_at = new Date().toISOString();

  return {
    success: true,
    deliveryStatus: 'Ready for user transmission via WhatsApp handoff link',
    handoffUrl: msg.handoff_url,
    messageId
  };
}

export function listWhatsAppMessages(status?: string): WhatsAppMessageRecord[] {
  if (status) {
    return storedMessages.filter(m => m.status === status);
  }
  return [...storedMessages];
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jarvis-passcode, x-jarvis-token, x-jarvis-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const messages = listWhatsAppMessages();
  res.status(200).json({ success: true, messages });
}

