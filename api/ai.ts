import { resolveAIConfig, executeAIConversation, classifyAIError, maskApiKey } from './aiService.js';

// In-memory sliding-window IP rate limiter
const ipRequestWindow = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestWindow.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequestWindow.set(ip, validTimestamps);
    return false; // Exceeded
  }
  
  validTimestamps.push(now);
  ipRequestWindow.set(ip, validTimestamps);
  return true;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ai-api-key, x-ai-provider, x-jarvis-passcode');

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

  // Passcode Protection (if JARVIS_ACCESS_PASSCODE is configured in environment)
  const serverPasscode = process.env.JARVIS_ACCESS_PASSCODE;
  if (serverPasscode) {
    const providedPasscode = req.headers['x-jarvis-passcode'] || req.query?.passcode;
    if (providedPasscode !== serverPasscode) {
      res.status(401).json({
        success: false,
        error: 'PASSCODE_REQUIRED',
        message: 'This personal JARVIS deployment is protected. Please provide a valid passcode in the Connections tab.'
      });
      return;
    }
  }

  const clientKey = req.headers['x-ai-api-key'] || req.body?.aiApiKey;
  const clientProvider = req.headers['x-ai-provider'] || req.body?.aiProvider;
  const aiConfig = resolveAIConfig(clientKey, clientProvider);

  // GET: Status of AI Service
  if (req.method === 'GET') {
    let source = 'none';
    if (clientKey) source = 'client_header';
    else if (process.env.GEMINI_API_KEY) source = 'gemini_env';
    else if (process.env.OPENAI_API_KEY) source = 'openai_env';
    else if (process.env.ANTHROPIC_API_KEY) source = 'anthropic_env';
    else if (process.env.GROQ_API_KEY) source = 'groq_env';

    res.status(200).json({
      success: true,
      configured: !!aiConfig,
      source,
      provider: aiConfig?.provider || 'none',
      model: aiConfig?.model || (aiConfig?.provider === 'gemini' ? 'gemini-3.5-flash-lite' : 'none'),
      maskedKey: maskApiKey(aiConfig?.apiKey),
      environment: process.env.VERCEL ? 'vercel-production' : 'local-node',
      passcodeRequired: !!serverPasscode,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // POST: Real Connection Test / Execution Ping
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // use raw
      }
    }

    const testPrompt = body?.prompt || 'What is 17 multiplied by 6?';
    const startTime = Date.now();

    if (!aiConfig) {
      res.status(200).json({
        success: false,
        latencyMs: 0,
        errorCode: 'CONFIG_MISSING',
        errorMessage: 'No AI API key configured in server environment (GEMINI_API_KEY) or request headers.',
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
