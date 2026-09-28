export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const hasWhatsApp = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  const hasGmail = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const hasOutlook = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);

  const integrations = [
    {
      id: 'int-whatsapp',
      name: 'Meta WhatsApp Business Platform (Cloud API)',
      type: 'whatsapp',
      status: hasWhatsApp ? 'connected' : 'demo',
      config: {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'Not Configured (Using wa.me direct handoff)',
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'Not Configured'
      },
      permissions: ['whatsapp_business_messaging', 'whatsapp_business_management'],
      capabilities: ['Template Messages', 'Direct wa.me Handoff', 'Recipient Verification']
    },
    {
      id: 'int-gmail',
      name: 'Google Gmail (OAuth 2.0)',
      type: 'email',
      status: hasGmail ? 'connected' : 'demo',
      config: {
        clientId: process.env.GOOGLE_CLIENT_ID ? 'Configured in Environment' : 'Not Configured (Demo Mode Active)',
        authUrl: '/api/oauth/google/authorize'
      },
      permissions: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.readonly'
      ],
      capabilities: ['Draft Creation', 'Authorized Sending', 'Attachment Inspection']
    },
    {
      id: 'int-outlook',
      name: 'Microsoft Outlook 365 (Graph OAuth 2.0)',
      type: 'email',
      status: hasOutlook ? 'connected' : 'demo',
      config: {
        clientId: process.env.MICROSOFT_CLIENT_ID ? 'Configured in Environment' : 'Not Configured (Demo Mode Active)',
        authUrl: '/api/oauth/microsoft/authorize'
      },
      permissions: ['Mail.Send', 'Mail.ReadWrite', 'Calendars.ReadWrite'],
      capabilities: ['Outlook Drafts', 'Graph Message Dispatch', 'Multi-recipient Sync']
    },
    {
      id: 'int-cal',
      name: 'Calendar Scheduling Service',
      type: 'calendar',
      status: 'connected',
      config: { provider: 'cloud_calendar', timezone: 'Asia/Karachi' },
      permissions: ['calendar.events.freebusy', 'calendar.events.write'],
      capabilities: ['Conflict Detection', 'Event Confirmation', 'Timezone Alignment']
    },
    {
      id: 'int-companion',
      name: 'macOS Local Companion Automation Engine',
      type: 'system',
      status: 'demo', // Evaluated client-side against 127.0.0.1:4001
      config: { companionPort: 4001, companionHost: '127.0.0.1' },
      permissions: ['Accessibility / UI Scripting', 'AppleScript Automation', 'Speech Synthesis', 'Screen Inspection'],
      capabilities: ['Desktop App Activation', 'Cursor Text Insertion', 'Text-to-Speech Aloud', 'Emergency Stop']
    }
  ];

  res.status(200).json({
    success: true,
    integrations
  });
}
