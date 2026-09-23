export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check actual environment configuration truth
  const hasWhatsApp = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  const hasGmail = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasOutlook = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);

  res.status(200).json({
    success: true,
    server: {
      status: 'online',
      environment: process.env.VERCEL ? 'vercel-production' : 'local-node',
      version: '1.2.0',
      timestamp: new Date().toISOString()
    },
    integrations: {
      whatsapp: {
        configured: hasWhatsApp,
        status: hasWhatsApp ? 'connected' : 'needs_setup',
        mode: hasWhatsApp ? 'live_cloud_api' : 'demo_handoff'
      },
      gmail: {
        configured: hasGmail,
        status: hasGmail ? 'connected' : 'needs_setup',
        mode: hasGmail ? 'live_oauth2' : 'demo_simulation'
      },
      outlook: {
        configured: hasOutlook,
        status: hasOutlook ? 'connected' : 'needs_setup',
        mode: hasOutlook ? 'live_graph' : 'demo_simulation'
      },
      calendar: {
        configured: true,
        status: 'connected',
        mode: 'cloud_calendar'
      },
      localCompanion: {
        configured: true,
        status: 'standby',
        url: 'http://127.0.0.1:4001',
        instructions: 'Run `npm run companion` on macOS to pair real computer control'
      }
    }
  });
}
