export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    status: 'online',
    assistant: 'J.A.R.V.I.S.',
    version: '1.2.0',
    deployment: 'vercel-serverless',
    timestamp: new Date().toISOString()
  });
}
