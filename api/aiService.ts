export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface AIServiceConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'auto';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  systemInstruction?: string;
}

export interface AIResponse {
  reply: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

export const BASE_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S., a highly capable, intelligent, and courteous personal AI assistant inspired by Tony Stark's JARVIS.
Key guidelines:
1. Follow the user's explicit instructions carefully. Adhere strictly to any requested length, structure, or format (e.g. "Reply with only: Hello" or "Write a two-sentence meeting request").
2. Context Awareness & Follow-ups: When the user asks a follow-up referring to "previous answer", "that", "it", "the second one", or previous drafts, ALWAYS examine the preceding messages in the conversation history and build directly upon them.
3. Arithmetic Precision: When asked to calculate or operate on previous results (e.g., "What is 23 multiplied by 7?", "Add 9 to your previous answer"), compute and return the exact mathematical value.
4. Support English, Urdu, and mixed Roman-Urdu seamlessly.
5. Be concise, respectful, and helpful.`;

/**
 * Call Google Gemini API via native fetch
 */
async function callGemini(apiKey: string, messages: ChatMessage[], modelName = 'gemini-3.5-flash-lite', customSystem?: string): Promise<AIResponse> {
  const modelsToTry = [modelName, 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
  const uniqueModels = Array.from(new Set(modelsToTry));

  // Format messages for Gemini API
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const payload: any = {
    contents,
    systemInstruction: {
      parts: [{ text: customSystem || BASE_SYSTEM_INSTRUCTION }]
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024
    }
  };

  let lastError = '';
  for (const mName of uniqueModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        lastError = await res.text().catch(() => '');
        if (res.status === 404 || res.status === 503 || res.status === 429) {
          continue;
        }
        throw new Error(`Gemini API error (${res.status}): ${lastError}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini API returned an empty response.');
      }

      return {
        reply: text.trim(),
        provider: 'gemini',
        model: mName,
        tokensUsed: data?.usageMetadata?.totalTokenCount
      };
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('503') || err.message?.includes('429')) {
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Gemini API error: ${lastError || 'All Gemini models unavailable'}`);
}

/**
 * Call OpenAI API or OpenAI-compatible (Groq) via native fetch
 */
async function callOpenAICompatible(
  apiKey: string,
  messages: ChatMessage[],
  endpoint = 'https://api.openai.com/v1/chat/completions',
  modelName = 'gpt-4o-mini',
  providerName = 'openai',
  customSystem?: string
): Promise<AIResponse> {
  const formattedMessages = [
    { role: 'system', content: customSystem || BASE_SYSTEM_INSTRUCTION },
    ...messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content
    }))
  ];

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: formattedMessages,
      temperature: 0.2
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${providerName} API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`${providerName} returned an empty response.`);
  }

  return {
    reply: text.trim(),
    provider: providerName,
    model: modelName,
    tokensUsed: data?.usage?.total_tokens
  };
}

/**
 * Call Anthropic API via native fetch
 */
async function callAnthropic(apiKey: string, messages: ChatMessage[], modelName = 'claude-3-5-sonnet-20241022', customSystem?: string): Promise<AIResponse> {
  const formattedMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content
    }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelName,
      system: customSystem || BASE_SYSTEM_INSTRUCTION,
      messages: formattedMessages,
      max_tokens: 1024,
      temperature: 0.2
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) {
    throw new Error('Anthropic returned an empty response.');
  }

  return {
    reply: text.trim(),
    provider: 'anthropic',
    model: modelName
  };
}

/**
 * Resolve AI configuration from request headers, client payload, or environment
 */
export function resolveAIConfig(customKey?: string, customProvider?: string): AIServiceConfig | null {
  const apiKey =
    customKey ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GROQ_API_KEY ||
    '';

  if (!apiKey) {
    return null;
  }

  let provider: AIServiceConfig['provider'] = (customProvider as any) || 'auto';
  if (provider === 'auto') {
    if (customKey) {
      if (customKey.startsWith('AIzaSy') || customKey.startsWith('AQ.')) provider = 'gemini';
      else if (customKey.startsWith('sk-ant-')) provider = 'anthropic';
      else if (customKey.startsWith('gsk_')) provider = 'groq';
      else provider = 'openai';
    } else if (process.env.GEMINI_API_KEY || apiKey.startsWith('AQ.') || apiKey.startsWith('AIzaSy')) {
      provider = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      provider = 'openai';
    } else if (process.env.ANTHROPIC_API_KEY) {
      provider = 'anthropic';
    } else if (process.env.GROQ_API_KEY) {
      provider = 'groq';
    } else {
      provider = 'gemini';
    }
  }

  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL || (provider === 'gemini' ? 'gemini-3.5-flash-lite' : provider === 'groq' ? 'llama-3.3-70b-versatile' : undefined)
  };
}

/**
 * Universal conversation query
 */
export async function executeAIConversation(
  messages: ChatMessage[],
  config: AIServiceConfig
): Promise<AIResponse> {
  const { provider, apiKey, model, systemInstruction } = config;

  switch (provider) {
    case 'gemini':
      return callGemini(apiKey, messages, model || 'gemini-3.5-flash-lite', systemInstruction);
    case 'groq':
      return callOpenAICompatible(
        apiKey,
        messages,
        'https://api.groq.com/openai/v1/chat/completions',
        model || 'llama-3.3-70b-versatile',
        'groq',
        systemInstruction
      );
    case 'anthropic':
      return callAnthropic(apiKey, messages, model || 'claude-3-5-sonnet-20241022', systemInstruction);
    case 'openai':
    default:
      return callOpenAICompatible(
        apiKey,
        messages,
        'https://api.openai.com/v1/chat/completions',
        model || 'gpt-4o-mini',
        'openai',
        systemInstruction
      );
  }
}

/**
 * Helper to mask sensitive API key for display
 */
export function maskApiKey(key?: string): string | null {
  if (!key || key.length < 8) return null;
  const prefix = key.substring(0, 6);
  const suffix = key.substring(key.length - 4);
  return `${prefix}...${suffix}`;
}

/**
 * Error classifier for granular diagnostics
 */
export function classifyAIError(err: any): { errorCode: string; errorMessage: string } {
  const msg = err?.message || String(err) || 'Unknown AI error';
  const lower = msg.toLowerCase();

  if (lower.includes('quota') || lower.includes('billing') || lower.includes('resource_exhausted') || lower.includes('exceeded your current quota')) {
    return {
      errorCode: 'EXHAUSTED_QUOTA',
      errorMessage: 'Provider quota or credit balance has been exhausted. Check your provider billing or limits.'
    };
  }
  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('invalid api key') ||
    lower.includes('api key not valid') ||
    lower.includes('unauthorized') ||
    lower.includes('permission_denied')
  ) {
    return {
      errorCode: 'INVALID_CREDENTIALS',
      errorMessage: 'Configured API key was rejected by the provider (Invalid or lacking permission).'
    };
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return {
      errorCode: 'RATE_LIMIT',
      errorMessage: 'Provider request rate limit exceeded. Please wait a moment before trying again.'
    };
  }
  if (
    lower.includes('503') ||
    lower.includes('overloaded') ||
    lower.includes('high demand') ||
    lower.includes('service unavailable')
  ) {
    return {
      errorCode: 'HIGH_DEMAND_503',
      errorMessage: 'AI model is experiencing temporary high demand (HTTP 503). Retrying shortly.'
    };
  }
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('timed out')) {
    return {
      errorCode: 'TIMEOUT',
      errorMessage: 'Connection to AI service timed out after 15 seconds.'
    };
  }
  return {
    errorCode: 'SERVICE_ERROR',
    errorMessage: msg
  };
}
