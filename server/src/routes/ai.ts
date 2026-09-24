import { Router, Request, Response } from 'express';
import { resolveAIConfig, executeAIConversation, classifyAIError, maskApiKey } from '../ai/aiService.js';

const router = Router();

// GET /api/ai/status or /api/ai
router.get(['/', '/status'], (req: Request, res: Response) => {
  const clientKey = req.headers['x-ai-api-key'] as string;
  const clientProvider = req.headers['x-ai-provider'] as string;
  const aiConfig = resolveAIConfig(clientKey, clientProvider);

  let source = 'none';
  if (clientKey) source = 'client_header';
  else if (process.env.GEMINI_API_KEY) source = 'gemini_env';
  else if (process.env.OPENAI_API_KEY) source = 'openai_env';
  else if (process.env.ANTHROPIC_API_KEY) source = 'anthropic_env';
  else if (process.env.GROQ_API_KEY) source = 'groq_env';

  res.json({
    success: true,
    configured: !!aiConfig,
    source,
    provider: aiConfig?.provider || 'none',
    model: aiConfig?.model || (aiConfig?.provider === 'gemini' ? 'gemini-3.5-flash-lite' : 'none'),
    maskedKey: maskApiKey(aiConfig?.apiKey),
    environment: 'local-node',
    passcodeRequired: !!process.env.JARVIS_ACCESS_PASSCODE,
    timestamp: new Date().toISOString()
  });
});

// POST /api/ai/test or /api/ai
router.post(['/', '/test'], async (req: Request, res: Response) => {
  const clientKey = (req.headers['x-ai-api-key'] as string) || req.body?.aiApiKey;
  const clientProvider = (req.headers['x-ai-provider'] as string) || req.body?.aiProvider;
  const testPrompt = req.body?.prompt || 'What is 17 multiplied by 6?';
  const aiConfig = resolveAIConfig(clientKey, clientProvider);

  const startTime = Date.now();

  if (!aiConfig) {
    res.json({
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

    res.json({
      success: true,
      latencyMs,
      provider: result.provider,
      model: result.model,
      prompt: testPrompt,
      reply: result.reply,
      tokensUsed: result.tokensUsed,
      testedAt: new Date().toISOString()
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const classified = classifyAIError(err);

    res.json({
      success: false,
      latencyMs,
      errorCode: classified.errorCode,
      errorMessage: classified.errorMessage,
      provider: aiConfig.provider,
      model: aiConfig.model || 'unknown',
      testedAt: new Date().toISOString()
    });
  }
});

export default router;
