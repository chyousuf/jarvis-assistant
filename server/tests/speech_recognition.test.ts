import test from 'node:test';
import assert from 'node:assert';
import { orchestrator } from '../src/ai/orchestrator.js';
import { resolveContact } from '../src/tools/contacts.js';
import { createApproval, listApprovals } from '../src/tasks/approvalManager.js';

test('Speech: English Command "Open WhatsApp" executes application activation', async () => {
  const res = await orchestrator.processUserMessage('Open WhatsApp');
  assert.strictEqual(res.needsClarification, false);
  assert.strictEqual(res.rawTranscript, 'Open WhatsApp');
  assert.ok(res.reply.includes('WhatsApp'));
});

test('Speech: English Command "Read this aloud" activates screen content reading', async () => {
  const res = await orchestrator.processUserMessage('Read this aloud');
  assert.strictEqual(res.needsClarification, false);
  assert.ok(res.reply.includes('Reading Active Content'));
  assert.strictEqual(res.rawTranscript, 'Read this aloud');
});

test('Speech: Urdu Command "Chrome kholo" activates Google Chrome', async () => {
  const res = await orchestrator.processUserMessage('Chrome kholo');
  assert.strictEqual(res.needsClarification, false);
  assert.ok(res.reply.toLowerCase().includes('chrome'));
  assert.ok(res.interpretedAction?.includes('Chrome'));
});

test('Speech: Urdu Command "Is document ko save karo" executes document save', async () => {
  const res = await orchestrator.processUserMessage('Is document ko save karo');
  assert.strictEqual(res.needsClarification, false);
  assert.ok(res.reply.includes('save command (⌘S)'));
  assert.ok(res.interpretedAction?.includes('Save active document'));
});

test('Speech: Urdu Command "Ahmed ko message likho" flags contact ambiguity', async () => {
  // "Ahmed" matches Ahmed Raza and Ahmed Khan -> Should not guess, must clarify
  const res = await orchestrator.processUserMessage('Ahmed ko message likho');
  assert.strictEqual(res.needsClarification, true);
  assert.ok(res.reply.includes('Recipient ambiguity detected'));
  assert.ok(res.reply.includes('Ahmed Raza'));
  assert.ok(res.reply.includes('Ahmed Khan'));
});

test('Speech: Urdu Command "Ahmed Raza ko message likho" prompts for missing body', async () => {
  // Exact match resolves contact, but body is omitted -> Should ask for message body
  const res = await orchestrator.processUserMessage('Ahmed Raza ko message likho');
  assert.strictEqual(res.needsClarification, true);
  assert.ok(res.reply.includes('What message would you like to send to Ahmed Raza?'));
});

test('Speech: Mixed Command "Ahmed Raza ko WhatsApp message bhejo keh meeting start ho gayi hai"', async () => {
  const res = await orchestrator.processUserMessage('Ahmed Raza ko WhatsApp message bhejo keh meeting start ho gayi hai');
  assert.strictEqual(res.needsClarification, false);
  assert.ok(res.reply.includes('WhatsApp Confirmation Required'));
  assert.ok(res.reply.includes('meeting start ho gayi hai'));
  assert.ok(res.task !== undefined);
});

test('Speech: Voice Correction "No, I said open WhatsApp" supersedes prior action', async () => {
  // Create a dummy pending approval from a misheard action
  const { id: dummyApprovalId } = createApproval('misheard-task', 'email_send', 'Send misheard draft', {});
  const pendingBefore = listApprovals('pending');
  assert.ok(pendingBefore.some(a => a.id === dummyApprovalId));

  // User issues voice correction
  const res = await orchestrator.processUserMessage('No, I said open WhatsApp');
  assert.ok(res.reply.includes('Correction noted'));
  assert.ok(res.reply.includes('WhatsApp'));

  // Pending approval from previous action must have been aborted
  const pendingAfter = listApprovals('pending');
  assert.strictEqual(pendingAfter.some(a => a.id === dummyApprovalId), false);
});

test('Speech: Urdu Voice Correction "Nahin, Chrome kholo" cancels prior action', async () => {
  const res = await orchestrator.processUserMessage('Nahin, Chrome kholo');
  assert.ok(res.reply.includes('Correction noted'));
  assert.ok(res.reply.toLowerCase().includes('chrome'));
});

test('Speech: Silence or empty input returns idle status without executing tasks', async () => {
  const resEmpty = await orchestrator.processUserMessage('');
  assert.strictEqual(resEmpty.needsClarification, false);
  assert.strictEqual(resEmpty.task, undefined);
  assert.ok(resEmpty.reply.includes('online'));

  const resWhitespace = await orchestrator.processUserMessage('   ');
  assert.strictEqual(resWhitespace.needsClarification, false);
  assert.strictEqual(resWhitespace.task, undefined);
});
