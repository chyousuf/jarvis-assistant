import express, { Request, Response, NextFunction } from 'express';
import os from 'os';
import computerRouter from './routes/computer.js';
import companionRouter, { pairingToken, TOKEN_FILE, authenticateCompanion } from './routes/companion.js';

const app = express();
const PORT = parseInt(process.env.COMPANION_PORT || '4001', 10);
// Strictly bind to loopback address (127.0.0.1) - never expose daemon to LAN/0.0.0.0
const HOST = '127.0.0.1';

// Allowed CORS origins: Local development and official Vercel deployment
const ALLOWED_ORIGINS = [
  'https://jarvis-assistant-pi-dun.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

// 1. Host Header Validation (Prevents DNS Rebinding attacks)
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host || '';
  const allowedHosts = [`localhost:${PORT}`, `127.0.0.1:${PORT}`, 'localhost', '127.0.0.1'];
  if (!allowedHosts.includes(host)) {
    return res.status(403).json({
      error: 'Host header validation failed. Companion daemon only accepts connections on loopback interface.'
    });
  }
  next();
});

// 2. Strict CORS & Private Network Access (PNA) Validation
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string;

  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app');
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // Reject unauthorized origins explicitly - never fall back to wildcard '*'
      return res.status(403).json({ error: 'Origin not allowed by companion CORS policy.' });
    }
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jarvis-passcode, x-jarvis-token');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '5mb' }));

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
  console.log(`📡 Listening strictly at: http://127.0.0.1:${PORT}`);
  console.log(`🔐 Pairing Token: ${pairingToken}`);
  console.log(`📄 Token File: ${TOKEN_FILE}`);
  console.log('🌐 Paired with Vercel: https://jarvis-assistant-pi-dun.vercel.app');
  console.log('======================================================\n');
});

export default app;
