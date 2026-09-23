import express, { Request, Response, NextFunction } from 'express';
import os from 'os';
import computerRouter from './routes/computer.js';
import companionRouter, { pairingToken, TOKEN_FILE, authenticateCompanion } from './routes/companion.js';

const app = express();
const PORT = parseInt(process.env.COMPANION_PORT || '4001', 10);
const HOST = '0.0.0.0';

// Allowed CORS origins: Local web sessions and official Vercel deployment
const ALLOWED_ORIGINS = [
  'https://jarvis-assistant-pi-dun.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

// Handle Private Network Access (PNA) and CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string;
  if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ai-api-key, x-ai-provider');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Health / Status probe endpoint (Unauthenticated so web app can check pairing status)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    companion: 'JARVIS Local macOS Companion Daemon',
    version: '1.2.0',
    platform: process.platform,
    hostname: os.hostname(),
    requiresAuth: !!pairingToken,
    timestamp: new Date().toISOString()
  });
});

// Mount companion routes (/verify, /disconnect)
app.use('/api/companion', companionRouter);

// Mount computer router with auth
app.use('/api/computer', authenticateCompanion, computerRouter);

app.listen(PORT, HOST, () => {
  console.log('\n======================================================');
  console.log('🤖 J.A.R.V.I.S. Local macOS Companion Daemon Online');
  console.log(`📡 Listening at: http://127.0.0.1:${PORT} (and http://localhost:${PORT})`);
  console.log(`🔐 Pairing Token: ${pairingToken}`);
  console.log(`📄 Token File: ${TOKEN_FILE}`);
  console.log('🌐 Paired with Vercel: https://jarvis-assistant-pi-dun.vercel.app');
  console.log('======================================================\n');
});

export default app;
