import test from 'node:test';
import assert from 'node:assert';
import { resolveAIConfig, classifyAIError, maskApiKey } from '../src/ai/aiService.js';

test('AI Diagnostics: maskApiKey correctly masks keys', () => {
  const masked = maskApiKey('MOCK_TEST_SAMPLE_KEY_12345678');
  assert.strictEqual(masked, 'MOCK_T...5678');
  assert.strictEqual(maskApiKey(''), null);
  assert.strictEqual(maskApiKey('123'), null);
});

test('AI Diagnostics: classifyAIError categorizes provider errors correctly', () => {
  const quotaErr = classifyAIError(new Error('RESOURCE_EXHAUSTED: quota exceeded for current model'));
  assert.strictEqual(quotaErr.errorCode, 'EXHAUSTED_QUOTA');

  const authErr = classifyAIError(new Error('Gemini API error (401): API_KEY_INVALID'));
  assert.strictEqual(authErr.errorCode, 'INVALID_CREDENTIALS');

  const rateErr = classifyAIError(new Error('429 Too Many Requests: Rate limit exceeded'));
  assert.strictEqual(rateErr.errorCode, 'RATE_LIMIT');

  const overloadedErr = classifyAIError(new Error('Gemini API error (503): Model is overloaded due to high demand'));
  assert.strictEqual(overloadedErr.errorCode, 'HIGH_DEMAND_503');

  const timeoutErr = classifyAIError(new Error('The operation was aborted due to timeout'));
  assert.strictEqual(timeoutErr.errorCode, 'TIMEOUT');
});

test('AI Diagnostics: resolveAIConfig resolves client header override and server environment', () => {
  // Test client key resolution
  const customConfig = resolveAIConfig('sk-ant-testkey12345678', 'anthropic');
  assert.strictEqual(customConfig?.provider, 'anthropic');
  assert.strictEqual(customConfig?.apiKey, 'sk-ant-testkey12345678');

  // Test auto-detection
  const groqConfig = resolveAIConfig('gsk_testgroq12345678');
  assert.strictEqual(groqConfig?.provider, 'groq');
  assert.strictEqual(groqConfig?.model, 'llama-3.3-70b-versatile');
});
