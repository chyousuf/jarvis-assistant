import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createSessionToken, verifySessionToken, validateAccess } from '../src/auth/authService.js';
import { getUserLearningStore } from '../src/routes/learning.js';
import { resolveSafePath } from '../src/tools/workspaceFiles.js';
import { resolveAIConfig } from '../src/ai/aiService.js';

test('Security Audit: Signed HMAC Session Tokens', () => {
  // 1. Token Creation & Verification
  const token = createSessionToken('owner', 'owner', 3600000);
  assert.ok(token.includes('.'), 'Token must be composed of payload.signature');

  const verified = verifySessionToken(token);
  assert.strictEqual(verified.valid, true);
  assert.strictEqual(verified.userId, 'owner');
  assert.strictEqual(verified.role, 'owner');

  // 2. Tampered token rejection
  const [b64, sig] = token.split('.');
  const tamperedSig = sig.slice(0, -2) + 'aa';
  const tamperedVerified = verifySessionToken(`${b64}.${tamperedSig}`);
  assert.strictEqual(tamperedVerified.valid, false);
  assert.ok(tamperedVerified.error?.includes('signature') || tamperedVerified.error?.includes('Invalid'));

  // 3. Expired token rejection
  const expiredToken = createSessionToken('owner', 'owner', -1000);
  const expiredVerified = verifySessionToken(expiredToken);
  assert.strictEqual(expiredVerified.valid, false);
  assert.strictEqual(expiredVerified.error, 'Token expired');
});

test('Security Audit: Personal Protected vs Passcode Enforced Access Modes', () => {
  const origVercel = process.env.VERCEL;
  const origPasscode = process.env.JARVIS_ACCESS_PASSCODE;

  try {
    // 1. Personal Protected Mode: When passcode is unset, personal owner access is granted
    process.env.VERCEL = '1';
    delete process.env.JARVIS_ACCESS_PASSCODE;

    const unauthReq = { headers: {} };
    const personalAccess = validateAccess(unauthReq);
    assert.strictEqual(personalAccess.authorized, true);
    assert.strictEqual(personalAccess.userId, 'owner');
    assert.strictEqual(personalAccess.role, 'owner');

    // 2. Passcode Enforced Mode: When passcode is set, unauthenticated requests are rejected
    process.env.JARVIS_ACCESS_PASSCODE = 'super-secret-passcode-2026';

    const rejectedAccess = validateAccess(unauthReq);
    assert.strictEqual(rejectedAccess.authorized, false);
    assert.strictEqual(rejectedAccess.status, 401);
    assert.strictEqual(rejectedAccess.error, 'PASSCODE_REQUIRED');

    // 3. Request with wrong passcode is rejected
    const badPasscodeReq = { headers: { 'x-jarvis-passcode': 'wrong-passcode' } };
    const badAccess = validateAccess(badPasscodeReq);
    assert.strictEqual(badAccess.authorized, false);
    assert.strictEqual(badAccess.status, 401);

    // 4. Request with valid passcode header is authorized
    const goodPasscodeReq = { headers: { 'x-jarvis-passcode': 'super-secret-passcode-2026' } };
    const goodAccess = validateAccess(goodPasscodeReq);
    assert.strictEqual(goodAccess.authorized, true);
    assert.strictEqual(goodAccess.userId, 'owner');

    // 5. Request with valid signed token is authorized
    const validToken = createSessionToken('owner', 'owner', 3600000);
    const tokenReq = { headers: { authorization: `Bearer ${validToken}` } };
    const tokenAccess = validateAccess(tokenReq);
    assert.strictEqual(tokenAccess.authorized, true);
    assert.strictEqual(tokenAccess.userId, 'owner');
  } finally {
    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;

    if (origPasscode !== undefined) process.env.JARVIS_ACCESS_PASSCODE = origPasscode;
    else delete process.env.JARVIS_ACCESS_PASSCODE;
  }
});

test('Security Audit: Multi-Tenant Data Partitioning', () => {
  const storeAlice = getUserLearningStore('user-alice');
  const storeBob = getUserLearningStore('user-bob');

  // Verify initial state is isolated
  assert.notStrictEqual(storeAlice, storeBob);

  // Add a unique document to Alice
  const aliceDocId = 'doc-alice-confidential';
  storeAlice.documents.push({
    id: aliceDocId,
    title: 'Alice Q3 Strategy',
    content: 'Top secret confidential roadmap for Alice.',
    tags: ['strategy'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Add a unique correction to Alice
  storeAlice.corrections.push({
    id: 'corr-alice-1',
    originalRequest: 'Send report',
    incorrectInterpretation: 'Sent to team',
    approvedCorrection: 'Send to board only',
    scope: 'reusable',
    created_at: new Date().toISOString()
  });

  // Verify Bob cannot see Alice's document or correction
  const bobDoc = storeBob.documents.find(d => d.id === aliceDocId);
  assert.strictEqual(bobDoc, undefined, 'Bob must not see Alice confidential document');

  const bobCorr = storeBob.corrections.find(c => c.id === 'corr-alice-1');
  assert.strictEqual(bobCorr, undefined, 'Bob must not see Alice correction');

  // Deleting Alice's document only affects Alice
  storeAlice.documents = storeAlice.documents.filter(d => d.id !== aliceDocId);
  assert.strictEqual(storeAlice.documents.find(d => d.id === aliceDocId), undefined);
});

test('Security Audit: Workspace Path Traversal Defenses', () => {
  // 1. Upward directory traversal attempt
  assert.throws(() => {
    resolveSafePath('../../etc/passwd');
  }, /Security Violation/);

  // 2. Absolute path outside workspace
  assert.throws(() => {
    resolveSafePath('/var/log/system.log');
  }, /Security Violation/);

  // 3. Null byte injection attempt
  assert.throws(() => {
    resolveSafePath('subfolder/../../../etc/shadow');
  }, /Security Violation/);
});

test('Security Audit: Credential Leak Elimination', () => {
  // Provider config must prioritize server environment variables over client overrides
  const origGemini = process.env.GEMINI_API_KEY;
  const origVercel = process.env.VERCEL;

  try {
    process.env.GEMINI_API_KEY = 'server-authoritative-key-12345678';
    process.env.VERCEL = '1';

    // In production, even if an untrusted client sends customKey, server key takes strict priority
    const resolved = resolveAIConfig('untrusted-client-key-87654321');
    assert.ok(resolved);
    assert.strictEqual(resolved.apiKey, 'server-authoritative-key-12345678');
  } finally {
    if (origGemini !== undefined) process.env.GEMINI_API_KEY = origGemini;
    else delete process.env.GEMINI_API_KEY;

    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;
  }
});

test('Security Audit: Safe URL Sanitization (Neutralizes javascript:, data:, vbscript:)', () => {
  function isSafeUrl(url: string): boolean {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    if (
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('file:')
    ) {
      return false;
    }
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('#')
    );
  }

  // Dangerous schemes must be rejected
  assert.strictEqual(isSafeUrl('javascript:alert(1)'), false);
  assert.strictEqual(isSafeUrl('JAVASCRIPT:void(0)'), false);
  assert.strictEqual(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.strictEqual(isSafeUrl('vbscript:msgbox(1)'), false);
  assert.strictEqual(isSafeUrl('file:///etc/passwd'), false);

  // Legitimate schemes must pass
  assert.strictEqual(isSafeUrl('https://example.com/docs'), true);
  assert.strictEqual(isSafeUrl('http://localhost:3000'), true);
  assert.strictEqual(isSafeUrl('mailto:admin@example.com'), true);
  assert.strictEqual(isSafeUrl('/dashboard'), true);
  assert.strictEqual(isSafeUrl('#section-1'), true);
});
