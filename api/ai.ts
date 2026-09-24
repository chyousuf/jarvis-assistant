import { resolveAIConfig, executeAIConversation, classifyAIError } from './aiService.js';
import { validateAccess } from './authService.js';

// In-memory sliding-window IP rate limiter
const ipRequestWindow = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestWindow.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequestWindow.set(ip, validTimestamps);
    return false;
  }
  
  validTimestamps.push(now);
  ipRequestWindow.set(ip, validTimestamps);
  return true;
}

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

  // Rate Limiting
  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again shortly.'
    });
    return;
  }

  // Authenticate Access
  const auth = validateAccess(req);

  // Use only server-side environment secrets for AI execution (no client override)
  const aiConfig = resolveAIConfig();

  // GET: Status of AI Service (Never returns raw or masked key fragments)
  if (req.method === 'GET') {
    // If not authorized in production, return minimal status without internal details
    if (!auth.authorized) {
      res.status(200).json({
        success: true,
        authenticated: false,
        configured: !!aiConfig,
        provider: aiConfig?.provider || 'none',
        passcodeRequired: true,
        mode: auth.error === 'AUTH_CONFIG_MISSING' ? 'fail_closed' : 'protected',
        timestamp: new Date().toISOString()
      });
      return;
    }

    let source = 'none';
    if (process.env.GEMINI_API_KEY) source = 'gemini_env';
    else if (process.env.OPENAI_API_KEY) source = 'openai_env';
    else if (process.env.ANTHROPIC_API_KEY) source = 'anthropic_env';
    else if (process.env.GROQ_API_KEY) source = 'groq_env';

    res.status(200).json({
      success: true,
      authenticated: true,
      configured: !!aiConfig,
      source,
      provider: aiConfig?.provider || 'none',
      model: aiConfig?.model || (aiConfig?.provider === 'gemini' ? 'gemini-3.5-flash-lite' : 'none'),
      environment: process.env.VERCEL ? 'vercel-production' : 'local-node',
      passcodeRequired: true,
      lastVerification: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
    return;
  }

  // POST: Real Connection Test / Execution Ping (Requires Authentication & Paid Budget Protection)
  if (req.method === 'POST') {
    if (!auth.authorized) {
      res.status(auth.status || 401).json({
        success: false,
        error: auth.error || 'UNAUTHORIZED',
        message: auth.message || 'Authentication required to test AI connection.'
      });
      return;
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* noop */ }
    }

    // Limit test prompt length to prevent token abuse
    const rawPrompt = body?.prompt || 'What is 17 multiplied by 6?';
    const testPrompt = String(rawPrompt).slice(0, 200);
    const startTime = Date.now();

    if (!aiConfig) {
      res.status(200).json({
        success: false,
        latencyMs: 0,
        errorCode: 'CONFIG_MISSING',
        errorMessage: 'No server-side AI API key configured in environment variables (e.g. GEMINI_API_KEY).',
        provider: 'none',
        model: 'none',
        testedAt: new Date().toISOString()
      });
      return;
    }

    try {
      const result = await executeAIConversation(
        [{ role: 'user', content: testPrompt }],
        aiConfig
      );
      const latencyMs = Date.now() - startTime;

      res.status(200).json({
        success: true,
        latencyMs,
        provider: result.provider,
        model: result.model,
        prompt: testPrompt,
        reply: result.reply,
        tokensUsed: result.tokensUsed,
        testedAt: new Date().toISOString()
      });
      return;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const classified = classifyAIError(err);

      res.status(200).json({
        success: false,
        latencyMs,
        errorCode: classified.errorCode,
        errorMessage: classified.errorMessage,
        provider: aiConfig.provider,
        model: aiConfig.model || 'unknown',
        testedAt: new Date().toISOString()
      });
      return;
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
