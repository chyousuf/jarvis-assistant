import { validateAccess } from './authService.js';
import { APPROVED_CONTACTS } from './contacts.js';

interface WhatsAppMessageRecord {
  id: string;
  recipient_phone: string;
  recipient_name: string;
  message_text: string;
  status: 'pending_approval' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'handoff_prepared';
  handoff_url: string;
  created_at: string;
  updated_at: string;
}

const storedWhatsApp: WhatsAppMessageRecord[] = [
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

function formatPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('03') && digits.length === 11) return '92' + digits.slice(1);
  return digits;
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

  const auth = validateAccess(req);
  if (!auth.authorized) {
    res.status(auth.status || 401).json({ success: false, error: auth.error, message: auth.message });
    return;
  }

  const url = req.url || '';
  const path = url.split('?')[0].replace(/^\/api\/whatsapp\/?/, '');

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  // POST /api/whatsapp/prepare
  if (req.method === 'POST' && (path === 'prepare' || path.endsWith('/prepare'))) {
    const { recipient, message } = body || {};
    if (!recipient || !message) {
      res.status(400).json({ success: false, error: 'recipient and message are required' });
      return;
    }

    const matchedContact = APPROVED_CONTACTS.find(c => c.name.toLowerCase() === recipient.toLowerCase() || c.name.toLowerCase().includes(recipient.toLowerCase()));
    const rawPhone = matchedContact?.phone || recipient;
    const cleanNumber = formatPhone(rawPhone);
    const handoffUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    const id = `wa-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const record: WhatsAppMessageRecord = {
      id,
      recipient_name: matchedContact?.name || recipient,
      recipient_phone: rawPhone.startsWith('+') ? rawPhone : (cleanNumber ? `+${cleanNumber}` : rawPhone),
      message_text: message,
      status: 'pending_approval',
      handoff_url: handoffUrl,
      created_at: now,
      updated_at: now
    };
    storedWhatsApp.unshift(record);

    res.status(200).json({
      success: true,
      messageId: id,
      recipientName: recipient,
      recipientPhone: record.recipient_phone,
      handoffUrl,
      status: 'pending_approval'
    });
    return;
  }

  // POST /api/whatsapp/:id/send
  const sendMatch = path.match(/^([^/]+)\/send$/);
  if (req.method === 'POST' && sendMatch) {
    const id = sendMatch[1];
    const msg = storedWhatsApp.find(m => m.id === id);
    if (msg) {
      msg.status = 'handoff_prepared';
      msg.updated_at = new Date().toISOString();
      res.status(200).json({
        success: true,
        deliveryStatus: 'Ready for user transmission via WhatsApp handoff link',
        handoffUrl: msg.handoff_url,
        messageId: id
      });
      return;
    }
    res.status(200).json({
      success: true,
      deliveryStatus: 'Ready for user transmission via WhatsApp handoff link',
      handoffUrl: 'https://wa.me/',
      messageId: id
    });
    return;
  }

  // GET /api/whatsapp
  res.status(200).json({ success: true, messages: storedWhatsApp });
}
