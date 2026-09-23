export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface AIServiceConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'auto';
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface AIResponse {
  reply: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

const SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S., a highly capable, intelligent, and courteous personal AI assistant inspired by Tony Stark's JARVIS.
Key guidelines:
1. Always follow the user's explicit instructions carefully.
2. If the user asks for a specific format (e.g. "Reply with only: Hello" or "Write a two-sentence meeting request"), adhere to it strictly.
3. Be concise, precise, and helpful. Do not add unnecessary fluff unless requested.
4. Support English, Urdu, and mixed Roman-Urdu seamlessly.
5. If doing math, calculate accurately (e.g., 17 * 6 = 102).`;

/**
 * Call Google Gemini API via native fetch
 */
async function callGemini(apiKey: string, messages: ChatMessage[], modelName = 'gemini-1.5-flash'): Promise<AIResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return {
    reply: text.trim(),
    provider: 'gemini',
    model: modelName
  };
}

/**
 * Call OpenAI API or OpenAI-compatible (Groq) via native fetch
 */
async function callOpenAICompatible(
  apiKey: string,
  messages: ChatMessage[],
  endpoint = 'https://api.openai.com/v1/chat/completions',
  modelName = 'gpt-4o-mini',
  providerName = 'openai'
): Promise<AIResponse> {
  const formattedMessages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
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
      temperature: 0.3
    })
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
async function callAnthropic(apiKey: string, messages: ChatMessage[], modelName = 'claude-3-5-sonnet-20241022'): Promise<AIResponse> {
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
      system: SYSTEM_INSTRUCTION,
      messages: formattedMessages,
      max_tokens: 1024,
      temperature: 0.3
    })
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
      if (customKey.startsWith('AIzaSy')) provider = 'gemini';
      else if (customKey.startsWith('sk-ant-')) provider = 'anthropic';
      else if (customKey.startsWith('gsk_')) provider = 'groq';
      else provider = 'openai';
    } else if (process.env.GEMINI_API_KEY) {
      provider = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      provider = 'openai';
    } else if (process.env.ANTHROPIC_API_KEY) {
      provider = 'anthropic';
    } else if (process.env.GROQ_API_KEY) {
      provider = 'groq';
    } else {
      provider = 'openai';
    }
  }

  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL || (provider === 'gemini' ? 'gemini-1.5-flash' : provider === 'groq' ? 'llama-3.3-70b-versatile' : undefined)
  };
}

/**
 * Universal conversation query
 */
export async function executeAIConversation(
  messages: ChatMessage[],
  config: AIServiceConfig
): Promise<AIResponse> {
  const { provider, apiKey, model } = config;

  switch (provider) {
    case 'gemini':
      return callGemini(apiKey, messages, model || 'gemini-1.5-flash');
    case 'groq':
      return callOpenAICompatible(
        apiKey,
        messages,
        'https://api.groq.com/openai/v1/chat/completions',
        model || 'llama-3.3-70b-versatile',
        'groq'
      );
    case 'anthropic':
      return callAnthropic(apiKey, messages, model || 'claude-3-5-sonnet-20241022');
    case 'openai':
    default:
      return callOpenAICompatible(
        apiKey,
        messages,
        'https://api.openai.com/v1/chat/completions',
        model || 'gpt-4o-mini',
        'openai'
      );
  }
}
