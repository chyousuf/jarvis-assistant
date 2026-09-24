import crypto from 'crypto';
import { createSessionToken, validateAccess, isProductionEnvironment } from './authService.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jarvis-passcode, x-jarvis-token, x-jarvis-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const serverPasscode = process.env.JARVIS_ACCESS_PASSCODE;
  const isProd = isProductionEnvironment();
  const url = req.url || '';
  const action = url.split('?')[0].split('/').pop();

  // GET /api/auth/status or GET /api/auth
  if (req.method === 'GET' || action === 'status') {
    const auth = validateAccess(req);

    res.status(200).json({
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
    return;
  }

  // POST /api/auth/login
  if (req.method === 'POST' && (action === 'login' || !action || action === 'auth')) {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* noop */ }
    }

    const providedPasscode = body?.passcode || '';

    // If server passcode is configured, require match
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

    // Success: create signed token
    const token = createSessionToken('owner', 'owner');
    const secureFlag = isProd ? '; Secure' : '';
    res.setHeader('Set-Cookie', `jarvis_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${secureFlag}`);

    res.status(200).json({
      success: true,
      token,
      user: { id: 'owner', role: 'owner' },
      message: 'Owner authentication successful.'
    });
    return;
  }

  // POST /api/auth/logout
  if (req.method === 'POST' && action === 'logout') {
    res.setHeader('Set-Cookie', `jarvis_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
