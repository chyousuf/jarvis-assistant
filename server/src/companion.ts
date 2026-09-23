import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import computerRouter from './routes/computer.js';
import { computerTools } from './tools/computerTools.js';

const app = express();
const PORT = 4001;
const HOST = '0.0.0.0';

// Token file location in user home directory
const TOKEN_FILE = path.join(os.homedir(), '.jarvis_token');

// Read or generate pairing token
let pairingToken = process.env.JARVIS_COMPANION_TOKEN || '';
if (!pairingToken) {
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      pairingToken = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
    } catch {
      // ignore
    }
  }
}

if (!pairingToken) {
  pairingToken = crypto.randomBytes(16).toString('hex');
  try {
    fs.writeFileSync(TOKEN_FILE, pairingToken, { mode: 0o600 });
  } catch {
    // ignore
  }
}

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

// Authenticated verification endpoint for Setup Wizard
app.get('/api/companion/verify', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (pairingToken && token !== pairingToken) {
    res.status(401).json({
      success: false,
      error: 'Invalid pairing token. Please check ~/.jarvis_token or the terminal where `npm run companion` is running.'
    });
    return;
  }

  const osStatus = computerTools.getOSStatus();
  const activeWindow = computerTools.inspectWindow();

  res.json({
    success: true,
    verified: true,
    device: {
      hostname: os.hostname(),
      platform: os.platform(),
      osRelease: os.release(),
      arch: os.arch(),
      uptimeSeconds: Math.floor(os.uptime())
    },
    permissions: osStatus,
    activeWindow,
    timestamp: new Date().toISOString()
  });
});

// Revoke / Disconnect endpoint
app.post('/api/companion/disconnect', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Browser session disconnected from local companion.'
  });
});

// Authentication middleware for computer-control endpoints
const authenticateCompanion = (req: Request, res: Response, next: NextFunction) => {
  // Allow unauthenticated GET status so the UI can truthfully display permissions & active app
  if (req.method === 'GET' && req.path === '/status') {
    return next();
  }

  // If pairingToken is configured, verify header
  if (pairingToken) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.status(401).json({
        error: 'Pairing token required. Please paste your JARVIS pairing token into the Computer Control settings.'
      });
      return;
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token !== pairingToken) {
      res.status(403).json({
        error: 'Invalid companion pairing token. Check ~/.jarvis_token or the companion daemon terminal.'
      });
      return;
    }
  }

  next();
};

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
