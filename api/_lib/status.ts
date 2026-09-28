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
  const hasAI = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY);
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
      ai: {
        configured: hasAI,
        status: hasAI ? 'configured' : 'needs_setup',
        provider: process.env.GEMINI_API_KEY ? 'gemini' : process.env.OPENAI_API_KEY ? 'openai' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.GROQ_API_KEY ? 'groq' : 'none',
        model: process.env.AI_MODEL || (process.env.GEMINI_API_KEY ? 'gemini-3.5-flash-lite' : undefined)
      },
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
