import aiHandler from './ai.js';
import authHandler from './auth.js';
import { validateAccess } from './authService.js';
import { APPROVED_CONTACTS } from './contacts.js';
import { listWhatsAppMessages, prepareWhatsAppMessage, sendWhatsAppMessage } from './whatsappService.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jarvis-passcode, x-jarvis-token, x-jarvis-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = req.url || '';
  const path = url.split('?')[0].replace(/^\/api\/?/, '');

  if (path.startsWith('auth')) {
    return authHandler(req, res);
  }

  if (path.startsWith('ai')) {
    return aiHandler(req, res);
  }

  // Public status and health checks
  if (path.startsWith('health')) {
    res.status(200).json({
      status: 'online',
      assistant: 'J.A.R.V.I.S.',
      version: '1.2.0',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (path.startsWith('computer/status')) {
    // When queried on Vercel without local companion
    res.status(200).json({
      success: true,
      companionConnected: false,
      os: {
        platform: 'cloud-serverless',
        isMacOS: false,
        osRelease: 'Vercel Serverless Function',
        hasAccessibility: false,
        hasAutomation: false,
        hasScreenCapture: false,
        hasSpeechSynthesis: false
      },
      activeWindow: {
        frontmostApp: 'Companion Disconnected',
        windowTitle: 'Run `npm run companion` on Mac to pair',
        isBrowser: false,
        isEditor: false,
        isCommunication: false
      },
      authorizedFolders: []
    });
    return;
  }

  // Gate all private routes behind access validation
  const auth = validateAccess(req);
  if (!auth.authorized) {
    res.status(auth.status || 401).json({
      success: false,
      error: auth.error,
      message: auth.message
    });
    return;
  }

  // Private Sub-route handling
  if (path.startsWith('contacts')) {
    res.status(200).json({
      success: true,
      contacts: APPROVED_CONTACTS
    });
    return;
  }

  if (path.startsWith('tasks/approvals/pending')) {
    res.status(200).json({ success: true, approvals: [] });
    return;
  }

  if (path.startsWith('tasks')) {
    res.status(200).json({ success: true, tasks: [] });
    return;
  }

  if (path.startsWith('emails')) {
    res.status(200).json({ success: true, emails: [] });
    return;
  }

  // WhatsApp Sub-routes
  if (path === 'whatsapp/prepare' && req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { recipient, message } = body;
      if (!recipient || !message) {
        res.status(400).json({ success: false, error: 'Recipient and message are required.' });
        return;
      }
      const prep = await prepareWhatsAppMessage(recipient, message);
      res.status(200).json({ success: true, ...prep });
      return;
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
  }

  const sendMatch = path.match(/^whatsapp\/([^/]+)\/send$/);
  if (sendMatch && req.method === 'POST') {
    try {
      const messageId = sendMatch[1];
      const sent = await sendWhatsAppMessage(messageId);
      res.status(200).json(sent);
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
      return;
    }
  }

  if (path === 'whatsapp' || path.startsWith('whatsapp')) {
    const messages = listWhatsAppMessages();
    res.status(200).json({ success: true, messages });
    return;
  }

  if (path.startsWith('calendar')) {
    res.status(200).json({ success: true, events: [] });
    return;
  }

  if (path.startsWith('reminders')) {
    res.status(200).json({ success: true, reminders: [] });
    return;
  }

  if (path.startsWith('memory')) {
    res.status(200).json({ success: true, memories: [] });
    return;
  }

  if (path.startsWith('files')) {
    res.status(200).json({ success: true, files: [] });
    return;
  }

  if (path.startsWith('activity')) {
    res.status(200).json({
      success: true,
      logs: [
        {
          id: 'log-init',
          category: 'system',
          action: 'JARVIS Serverless API Online',
          details: 'Vercel serverless layer initialized with secure client transport',
          timestamp: new Date().toISOString()
        }
      ]
    });
    return;
  }

  if (path.startsWith('computer/status')) {
    // When queried on Vercel without local companion
    res.status(200).json({
      success: true,
      companionConnected: false,
      os: {
        platform: 'cloud-serverless',
        isMacOS: false,
        osRelease: 'Vercel Serverless Function',
        hasAccessibility: false,
        hasAutomation: false,
        hasScreenCapture: false,
        hasSpeechSynthesis: false
      },
      activeWindow: {
        frontmostApp: 'Companion Disconnected',
        windowTitle: 'Run `npm run companion` on Mac to pair',
        isBrowser: false,
        isEditor: false,
        isCommunication: false
      },
      authorizedFolders: []
    });
    return;
  }

  res.status(200).json({
    success: true,
    route: path,
    message: 'JARVIS API endpoint acknowledged',
    timestamp: new Date().toISOString()
  });
}
