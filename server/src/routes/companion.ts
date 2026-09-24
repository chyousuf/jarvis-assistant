import { Router, Request, Response, NextFunction } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { computerTools } from '../tools/computerTools.js';

export const TOKEN_FILE = path.join(os.homedir(), '.jarvis_token');

// Read or generate pairing token
export let pairingToken = process.env.JARVIS_COMPANION_TOKEN || '';
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

function safeCompareTokens(provided?: string, expected?: string): boolean {
  if (!provided || !expected) return false;
  const pBuf = Buffer.from(provided);
  const eBuf = Buffer.from(expected);
  if (pBuf.length !== eBuf.length) return false;
  return crypto.timingSafeEqual(pBuf, eBuf);
}

const router = Router();

// Authenticated verification endpoint for Setup Wizard
router.get('/verify', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (pairingToken && !safeCompareTokens(token, pairingToken)) {
    res.status(401).json({
      success: false,
      error: 'Invalid pairing token. Please check ~/.jarvis_token or the terminal where JARVIS is running.'
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
router.post('/disconnect', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Browser session disconnected from local companion.'
  });
});

// Middleware to authenticate companion requests
export const authenticateCompanion = (req: Request, res: Response, next: NextFunction) => {
  // Allow unauthenticated GET status so the UI can truthfully display permissions & active app
  if (req.method === 'GET' && (req.path === '/status' || req.path === '/api/computer/status')) {
    return next();
  }

  if (pairingToken) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.status(401).json({
        error: 'Pairing token required. Please paste your JARVIS pairing token into the Computer Control settings.'
      });
      return;
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!safeCompareTokens(token, pairingToken)) {
      res.status(403).json({
        error: 'Invalid companion pairing token. Check ~/.jarvis_token or the JARVIS terminal.'
      });
      return;
    }
  }

  next();
};

export default router;
