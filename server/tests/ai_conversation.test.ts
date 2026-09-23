import { test } from 'node:test';
import assert from 'node:assert';
import { resolveAIConfig, executeAIConversation, ChatMessage } from '../src/ai/aiService.js';

test('AI Service: Resolves Gemini and OpenAI key types correctly', () => {
  const geminiConfig = resolveAIConfig('AIzaSyTestKey123');
  assert.strictEqual(geminiConfig?.provider, 'gemini');
  assert.strictEqual(geminiConfig?.apiKey, 'AIzaSyTestKey123');

  const openaiConfig = resolveAIConfig('sk-test123');
  assert.strictEqual(openaiConfig?.provider, 'openai');

  const groqConfig = resolveAIConfig('gsk_test123');
  assert.strictEqual(groqConfig?.provider, 'groq');

  const anthropicConfig = resolveAIConfig('sk-ant-test123');
  assert.strictEqual(anthropicConfig?.provider, 'anthropic');

  const nullConfig = resolveAIConfig('');
  assert.strictEqual(nullConfig, null);
});

test('AI Service: Multi-turn Context Maintenance', () => {
  const history: ChatMessage[] = [
    { role: 'user', content: 'Write a polite two-sentence meeting request.' },
    { role: 'assistant', content: 'Dear Ahmed, I hope this note finds you well. Could we schedule a brief 15-minute sync tomorrow morning to align on our project milestones?' },
    { role: 'user', content: 'Make your previous answer shorter.' }
  ];

  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[2].content, 'Make your previous answer shorter.');
});
