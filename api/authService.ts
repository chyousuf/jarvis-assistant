import crypto from 'crypto';

// Secret used for HMAC signing of session tokens
const SERVER_AUTH_SECRET = process.env.JARVIS_AUTH_SECRET || process.env.JARVIS_ACCESS_PASSCODE || 'jarvis-default-local-hmac-secret-2026';

export interface AuthContext {
  authorized: boolean;
  userId: string;
  role: 'owner' | 'guest';
  error?: string;
  message?: string;
  status?: number;
}

export function isProductionEnvironment(): boolean {
  return !!process.env.VERCEL || process.env.NODE_ENV === 'production';
}

/**
 * Creates an HMAC-SHA256 signed session token
 */
export function createSessionToken(userId = 'owner', role: 'owner' | 'guest' = 'owner', durationMs = 24 * 60 * 60 * 1000): string {
  const payload = {
    userId,
    role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    nonce: crypto.randomBytes(8).toString('hex')
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SERVER_AUTH_SECRET).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token
 */
export function verifySessionToken(token: string): { valid: boolean; userId?: string; role?: 'owner' | 'guest'; error?: string } {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, error: 'Malformed token' };
  }

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) {
    return { valid: false, error: 'Incomplete token components' };
  }

  const expectedSignature = crypto.createHmac('sha256', SERVER_AUTH_SECRET).update(payloadB64).digest('base64url');
  
  // Timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, error: 'Invalid token signature' };
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }

    return {
      valid: true,
      userId: payload.userId || 'owner',
      role: payload.role || 'owner'
    };
  } catch {
    return { valid: false, error: 'Invalid token payload' };
  }
}

/**
 * Parses cookies from HTTP Cookie header string
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const [name, value] = pair.trim().split('=');
    if (name && value) {
      cookies[decodeURIComponent(name.trim())] = decodeURIComponent(value.trim());
    }
  }

  return cookies;
}

/**
 * Validates access control on incoming requests.
 * Enforces Fail-Closed behavior in production if credentials are unconfigured.
 */
export function validateAccess(req: any): AuthContext {
  const isProd = isProductionEnvironment();
  const serverPasscode = process.env.JARVIS_ACCESS_PASSCODE;

  // 1. Fail closed in production if authentication configuration is completely absent
  if (isProd && !serverPasscode) {
    return {
      authorized: false,
      userId: 'anonymous',
      role: 'guest',
      error: 'AUTH_CONFIG_MISSING',
      message: 'Production deployment requires JARVIS_ACCESS_PASSCODE to be configured in environment variables. Access is locked to protect private assets.',
      status: 401
    };
  }

  // 2. Extract credentials from Cookie, Authorization header, or x-jarvis-passcode
  const cookieHeader = req.headers?.cookie || '';
  const cookies = parseCookies(cookieHeader);
  const sessionCookie = cookies['jarvis_session'];

  const authHeader = req.headers?.['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const headerPasscode = req.headers?.['x-jarvis-passcode'] || req.headers?.['x-jarvis-token'];

  // Optional multi-tenant user override for testing (e.g. testing cross-account isolation)
  const tenantOverride = req.headers?.['x-jarvis-user-id'] as string;

  // Check signed session token first (from cookie or Bearer header)
  const tokenCandidate = bearerToken || sessionCookie || (headerPasscode && headerPasscode.includes('.') ? headerPasscode : null);
  if (tokenCandidate) {
    const verified = verifySessionToken(tokenCandidate);
    if (verified.valid) {
      return {
        authorized: true,
        userId: tenantOverride || verified.userId || 'owner',
        role: verified.role || 'owner'
      };
    }
  }

  // Check raw passcode if configured
  if (serverPasscode) {
    const providedPasscode = headerPasscode || bearerToken || req.query?.passcode;
    if (providedPasscode) {
      const pBuf = Buffer.from(String(providedPasscode));
      const sBuf = Buffer.from(String(serverPasscode));
      const matches = pBuf.length === sBuf.length && crypto.timingSafeEqual(pBuf, sBuf);

      if (matches) {
        return {
          authorized: true,
          userId: tenantOverride || 'owner',
          role: 'owner'
        };
      }
    }

    return {
      authorized: false,
      userId: 'anonymous',
      role: 'guest',
      error: 'PASSCODE_REQUIRED',
      message: 'This personal JARVIS deployment is protected. Please provide a valid passcode.',
      status: 401
    };
  }

  // In non-production (local development) without a passcode set:
  // Allow local owner access, with support for testing alternate users via x-jarvis-user-id
  return {
    authorized: true,
    userId: tenantOverride || 'owner',
    role: 'owner'
  };
}
