import { validateAccess } from './authService.js';

export const APPROVED_CONTACTS = [
  { id: 'cnt-1', name: 'Ahmed Raza', email: 'ahmed.raza@example.com', phone: '+923001234567', company: 'Nexus Tech' },
  { id: 'cnt-2', name: 'Ahmed Khan', email: 'ahmed.khan@example.com', phone: '+923219876543', company: 'Alpha Solutions' },
  { id: 'cnt-3', name: 'Ali Hassan', email: 'ali.hassan@example.com', phone: '+923335551234', company: 'DevStudio' },
  { id: 'cnt-4', name: 'Sarah Miller', email: 'sarah@example.com', phone: '+14155552671', company: 'CloudCorp' }
];

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

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    const { name, email, phone, company } = body || {};
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }
    const newContact = {
      id: `cnt-${Date.now().toString(36)}`,
      name,
      email: email || null,
      phone: phone || null,
      company: company || 'Personal'
    };
    APPROVED_CONTACTS.push(newContact);
    res.status(200).json({ success: true, contact: newContact });
    return;
  }

  res.status(200).json({ success: true, contacts: APPROVED_CONTACTS });
}
