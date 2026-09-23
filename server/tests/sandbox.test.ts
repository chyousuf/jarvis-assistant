import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { resolveSafePath, createWorkspaceFile, readWorkspaceFile, deleteWorkspaceFile, listWorkspaceFiles } from '../src/tools/workspaceFiles.js';

test('Sandbox Security: resolveSafePath prevents directory traversal attacks', () => {
  // Should allow normal relative paths
  const validPath = resolveSafePath('test-doc.md');
  assert.ok(validPath.includes('test-doc.md'));

  // Should allow nested relative paths
  const nestedPath = resolveSafePath('subfolder/notes.txt');
  assert.ok(nestedPath.includes('notes.txt'));

  // Should THROW security error on directory traversal attempts
  assert.throws(() => {
    resolveSafePath('../../etc/passwd');
  }, /Security Violation/);

  assert.throws(() => {
    resolveSafePath('/etc/shadow');
  }, /Security Violation/);

  assert.throws(() => {
    resolveSafePath('../../../private/var/log');
  }, /Security Violation/);
});

test('Workspace File Operations: Create, Read, List, and Delete', async () => {
  const filename = `test-${Date.now()}.txt`;
  const content = 'JARVIS Security Protocol Alpha 123';

  // 1. Create file
  const createRes = await createWorkspaceFile(filename, content);
  assert.strictEqual(createRes.success, true);
  assert.ok(createRes.bytesWritten > 0);

  // 2. Read file
  const readRes = await readWorkspaceFile(filename);
  assert.strictEqual(readRes.content, content);
  assert.strictEqual(readRes.size, createRes.bytesWritten);

  // 3. List files
  const listRes = await listWorkspaceFiles();
  const found = listRes.some(f => f.name === filename);
  assert.strictEqual(found, true);

  // 4. Delete file
  const delRes = await deleteWorkspaceFile(filename);
  assert.strictEqual(delRes.success, true);

  // 5. Verify file is gone
  await assert.rejects(async () => {
    await readWorkspaceFile(filename);
  }, /not found in workspace/);
});
