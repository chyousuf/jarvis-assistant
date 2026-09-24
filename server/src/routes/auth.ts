import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { createSessionToken, validateAccess, isProductionEnvironment } from '../auth/authService.js';

const router = Router();

// GET /api/auth/status
router.get(['/', '/status'], (req: Request, res: Response) => {
  const auth = validateAccess(req);
  const serverPasscode = process.env.JARVIS_ACCESS_PASSCODE;
  const isProd = isProductionEnvironment();

  res.json({
    success: true,
    authenticated: auth.authorized,
    passcodeRequired: !!serverPasscode,
    configured: true,
    user: auth.authorized ? { id: auth.userId, role: auth.role } : null,
    mode: serverPasscode ? 'passcode_enforced' : 'personal_protected',
    error: auth.error,
    message: auth.message,
    timestamp: new Date().toISOString()
  });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const serverPasscode = process.env.JARVIS_ACCESS_PASSCODE;
  const isProd = isProductionEnvironment();
  const providedPasscode = req.body?.passcode || '';

  if (serverPasscode) {
    const pBuf = Buffer.from(String(providedPasscode));
    const sBuf = Buffer.from(String(serverPasscode));
    const matches = pBuf.length === sBuf.length && crypto.timingSafeEqual(pBuf, sBuf);

    if (!matches) {
      res.status(401).json({
        success: false,
        error: 'INVALID_PASSCODE',
        message: 'Incorrect access passcode. Please check your deployment secret.'
      });
      return;
    }
  }

  const token = createSessionToken('owner', 'owner');
  const secureFlag = isProd ? '; Secure' : '';
  res.setHeader('Set-Cookie', `jarvis_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${secureFlag}`);

  res.json({
    success: true,
    token,
    user: { id: 'owner', role: 'owner' },
    message: 'Owner authentication successful.'
  });
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', `jarvis_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

export const authRouter = router;
