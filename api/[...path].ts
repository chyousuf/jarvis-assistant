import aiHandler from './ai.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ai-api-key, x-ai-provider, x-jarvis-passcode');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = req.url || '';
  const path = url.split('?')[0].replace(/^\/api\/?/, '');

  if (path.startsWith('ai')) {
    return aiHandler(req, res);
  }

  // Sub-route handling
  if (path.startsWith('contacts')) {
    res.status(200).json({
      success: true,
      contacts: [
        { id: 'cnt-1', name: 'Ahmed Raza', email: 'ahmed.raza@example.com', phone: '+923001234567', company: 'Nexus Tech' },
        { id: 'cnt-2', name: 'Ahmed Khan', email: 'ahmed.khan@example.com', phone: '+923219876543', company: 'Alpha Solutions' },
        { id: 'cnt-3', name: 'Ali Hassan', email: 'ali.hassan@example.com', phone: '+923335551234', company: 'DevStudio' },
        { id: 'cnt-4', name: 'Sarah Miller', email: 'sarah@example.com', phone: '+14155552671', company: 'CloudCorp' }
      ]
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

  if (path.startsWith('whatsapp')) {
    res.status(200).json({ success: true, messages: [] });
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
