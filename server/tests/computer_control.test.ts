import test from 'node:test';
import assert from 'node:assert';
import { detectOSAndPermissions } from '../src/computer/osDetector.js';
import { inspectActiveWindow, stopAllActions, captureScreen, AUTHORIZED_FOLDERS } from '../src/computer/macOSController.js';
import { computerTools } from '../src/tools/computerTools.js';
import { orchestrator } from '../src/ai/orchestrator.js';
import fs from 'fs';

test('OS Detection: Detects host operating system and permission primitives', () => {
  const osInfo = detectOSAndPermissions();
  assert.strictEqual(typeof osInfo.osType, 'string');
  assert.strictEqual(typeof osInfo.isMacOS, 'boolean');
  assert.ok(osInfo.isMacOS, 'Should detect macOS on current host');
  assert.strictEqual(osInfo.speechSynthesisGranted, true);
});

test('Window Inspection: Reads frontmost app and window properties', () => {
  const win = inspectActiveWindow();
  assert.strictEqual(typeof win.frontmostApp, 'string');
  assert.ok(win.frontmostApp.length > 0);
  assert.strictEqual(typeof win.isBrowser, 'boolean');
  assert.strictEqual(typeof win.isEditor, 'boolean');
});

test('Screen Capture: Captures current screen state to workspace', () => {
  const res = computerTools.captureScreen();
  assert.strictEqual(res.success, true);
  assert.ok(fs.existsSync(res.imagePath));
  assert.ok(res.imagePath.endsWith('.png'));

  // Clean up
  try {
    fs.unlinkSync(res.imagePath);
  } catch {
    // Ignore
  }
});

test('Emergency Stop: Halts active speech and actions', () => {
  const stop = stopAllActions();
  assert.strictEqual(typeof stop.speechStopped, 'boolean');
  assert.ok(stop.timestamp);
});

test('Authorized Folders: Includes Downloads, Documents, Desktop, and Workspace', () => {
  assert.ok(AUTHORIZED_FOLDERS.length >= 4);
  assert.ok(AUTHORIZED_FOLDERS.some(f => f.includes('Downloads')));
  assert.ok(AUTHORIZED_FOLDERS.some(f => f.includes('workspace')));
});

test('Orchestrator Computer Control: Emergency Stop intent', async () => {
  const res = await orchestrator.processUserMessage('stop');
  assert.strictEqual(res.needsClarification, false);
  assert.ok(res.reply.toLowerCase().includes('stop'));
});

test('Orchestrator Computer Control: Open YouTube and search intent', async () => {
  const res = await orchestrator.processUserMessage('Open YouTube and search for cooking videos');
  assert.strictEqual(res.needsClarification, false);
  assert.ok(res.reply.includes('YouTube'));
  assert.ok(res.reply.includes('cooking videos'));
});

test('Orchestrator Computer Control: Write text into active field intent', async () => {
  const res = await orchestrator.processUserMessage('Write hello here');
  assert.strictEqual(res.needsClarification, false);
  assert.ok(res.reply.includes('hello'));
});

test('Orchestrator Computer Control: Read active document intent', async () => {
  const res = await orchestrator.processUserMessage('read this');
  assert.strictEqual(res.needsClarification, false);
  assert.ok(res.reply.includes('Reading'));
});
