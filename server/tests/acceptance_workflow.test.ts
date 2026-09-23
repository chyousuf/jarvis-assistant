import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { orchestrator } from '../src/ai/orchestrator.js';
import { WORKSPACE_DIR } from '../src/config.js';

test('Acceptance Workflow: Open TextEdit, write and save document to workspace', async () => {
  const targetFile = path.join(WORKSPACE_DIR, 'jarvis-test.txt');

  // Clean prior test artifact if exists
  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
  }

  const prompt = 'Open TextEdit, write ‘This is a JARVIS test’, and save it as jarvis-test.txt in my approved workspace';
  const result = await orchestrator.processUserMessage(prompt);

  assert.strictEqual(result.needsClarification, false);
  assert.ok(result.reply.includes('jarvis-test.txt'), 'Reply must confirm target filename');
  assert.ok(result.reply.includes('This is a JARVIS test'), 'Reply must reflect written content');

  // Verify file on disk
  assert.ok(fs.existsSync(targetFile), 'Target file must exist in approved workspace directory');
  const writtenContent = fs.readFileSync(targetFile, 'utf8');
  assert.strictEqual(writtenContent, 'This is a JARVIS test');
});
