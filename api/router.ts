import chatHandler from './_lib/chat.js';
import aiHandler from './_lib/ai.js';
import authHandler from './_lib/auth.js';
import learningHandler from './_lib/learning.js';
import emailsHandler from './_lib/emails.js';
import calendarHandler from './_lib/calendar.js';
import whatsappHandler from './_lib/whatsapp.js';
import contactsHandler from './_lib/contacts.js';
import tasksHandler from './_lib/tasks.js';
import filesHandler from './_lib/files.js';
import memoryHandler from './_lib/memory.js';
import healthHandler from './_lib/health.js';
import statusHandler from './_lib/status.js';
import integrationsHandler from './_lib/integrations.js';

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

  if (path === 'chat' || path.startsWith('chat/')) {
    return chatHandler(req, res);
  }
  if (path === 'ai' || path.startsWith('ai/')) {
    return aiHandler(req, res);
  }
  if (path === 'auth' || path.startsWith('auth/')) {
    return authHandler(req, res);
  }
  if (path === 'learning' || path.startsWith('learning/')) {
    return learningHandler(req, res);
  }
  if (path === 'emails' || path.startsWith('emails/')) {
    return emailsHandler(req, res);
  }
  if (path === 'calendar' || path.startsWith('calendar/')) {
    return calendarHandler(req, res);
  }
  if (path === 'whatsapp' || path.startsWith('whatsapp/')) {
    return whatsappHandler(req, res);
  }
  if (path === 'contacts' || path.startsWith('contacts/')) {
    return contactsHandler(req, res);
  }
  if (path === 'tasks' || path.startsWith('tasks/')) {
    return tasksHandler(req, res);
  }
  if (path === 'files' || path.startsWith('files/')) {
    return filesHandler(req, res);
  }
  if (path === 'memory' || path.startsWith('memory/')) {
    return memoryHandler(req, res);
  }
  if (path === 'health' || path.startsWith('health/')) {
    return healthHandler(req, res);
  }
  if (path === 'status' || path.startsWith('status/')) {
    return statusHandler(req, res);
  }
  if (path === 'integrations' || path.startsWith('integrations/')) {
    return integrationsHandler(req, res);
  }

  if (path.startsWith('computer/status')) {
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

  if (path.startsWith('computer/')) {
    res.status(200).json({
      success: false,
      error: 'Companion Disconnected',
      message: 'Desktop companion not connected to cloud serverless runtime. Pair local companion on macOS.'
    });
    return;
  }

  if (path.startsWith('activity')) {
    res.status(200).json({
      success: true,
      logs: [
        {
          id: 'log-unified-serverless',
          category: 'system',
          action: 'JARVIS Unified Serverless API Active',
          details: 'Unified high-speed serverless router online',
          timestamp: new Date().toISOString()
        }
      ]
    });
    return;
  }

  if (path.startsWith('reminders')) {
    res.status(200).json({
      success: true,
      reminders: []
    });
    return;
  }

  res.status(200).json({
    success: true,
    route: path,
    message: 'JARVIS Unified API endpoint acknowledged',
    timestamp: new Date().toISOString()
  });
}
