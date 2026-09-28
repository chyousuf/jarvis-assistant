import { validateAccess } from './authService.js';

interface EmailRecord {
  id: string;
  to_address: string;
  subject: string;
  body: string;
  attachments?: string[];
  status: 'draft' | 'queued' | 'sent' | 'failed';
  provider?: string;
  provider_message_id?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

const storedEmails: EmailRecord[] = [
  {
    id: 'em-demo-1',
    to_address: 'ali.hassan@example.com',
    subject: 'Project Architecture Review',
    body: 'Good day Ali, please review the attached architecture blueprint.',
    attachments: [],
    status: 'draft',
    provider: 'gmail/direct',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'em-demo-2',
    to_address: 'ahmed.raza@example.com',
    subject: 'Weekly Status & Milestones',
    body: 'The Q3 milestones have been updated and all tests are passing.',
    attachments: [],
    status: 'sent',
    provider: 'gmail/direct',
    provider_message_id: 'msg-gml-882194',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
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

  const url = req.url || '';
  const path = url.split('?')[0].replace(/^\/api\/emails\/?/, '');

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  // POST /api/emails/draft
  if (req.method === 'POST' && (path === 'draft' || path.endsWith('/draft'))) {
    const { to, subject, body: emailBody, attachments } = body || {};
    if (!to || !subject || !emailBody) {
      res.status(400).json({ success: false, error: 'to, subject, and body are required.' });
      return;
    }

    const id = `em-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newDraft: EmailRecord = {
      id,
      to_address: to,
      subject,
      body: emailBody,
      attachments: attachments || [],
      status: 'draft',
      provider: 'gmail/direct',
      created_at: now,
      updated_at: now
    };
    storedEmails.unshift(newDraft);

    res.status(200).json({
      success: true,
      id,
      draftId: id,
      to_address: to,
      subject,
      status: 'draft',
      message: `Draft created for ${to}`
    });
    return;
  }

  // POST /api/emails/:id/send
  const sendMatch = path.match(/^([^/]+)\/send$/);
  if (req.method === 'POST' && sendMatch) {
    const id = sendMatch[1];
    const draft = storedEmails.find(e => e.id === id);
    if (!draft) {
      res.status(404).json({ success: false, error: 'Draft not found.' });
      return;
    }
    draft.status = 'sent';
    draft.updated_at = new Date().toISOString();
    res.status(200).json({
      success: true,
      id: draft.id,
      status: 'sent',
      message: `Email to ${draft.to_address} marked as sent.`
    });
    return;
  }

  // GET /api/emails
  const statusParam = req.query?.status;
  const emails = statusParam ? storedEmails.filter(e => e.status === statusParam) : storedEmails;
  res.status(200).json({ success: true, emails });
}
