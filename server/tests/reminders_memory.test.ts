import test from 'node:test';
import assert from 'node:assert';
import { createReminder, listReminders, cancelReminder, pollDueReminders } from '../src/tools/reminders.js';
import { saveMemory, listMemories, deleteMemory, getMemoriesContext } from '../src/tools/memoryTool.js';

test('Reminders: Create, list, poll due, and cancel', async () => {
  // 1. Create a reminder due 1 second ago (instant due test)
  const rem = await createReminder('Test urgent reminder', 'in 0 seconds');
  assert.ok(rem.id);
  assert.strictEqual(rem.status, 'pending');

  // 2. Poll due reminders
  const due = pollDueReminders();
  const matched = due.find(d => d.id === rem.id);
  assert.ok(matched, 'Fired reminder should be detected by pollDueReminders');
  assert.strictEqual(matched.status, 'fired');

  // 3. Cancel another reminder
  const rem2 = await createReminder('Future reminder', 'in 60 minutes');
  const cancelled = await cancelReminder(rem2.id);
  assert.strictEqual(cancelled, true);

  const list = await listReminders('cancelled');
  assert.ok(list.some(r => r.id === rem2.id));
});

test('Memory Management: Save, Context Injection, and User Deletion', async () => {
  const key = `test_pref_${Date.now()}`;
  const value = 'Prefers dark theme and concise code';

  // 1. Save memory
  const saved = await saveMemory(key, value, 'preference');
  assert.strictEqual(saved.key, key);
  assert.strictEqual(saved.value, value);

  // 2. Memory context contains the item
  const context = getMemoriesContext();
  assert.ok(context.includes(key));
  assert.ok(context.includes(value));

  // 3. User deletes memory
  const deleted = await deleteMemory(key);
  assert.strictEqual(deleted, true);

  // 4. Verify gone from context
  const updatedContext = getMemoriesContext();
  assert.strictEqual(updatedContext.includes(key), false);
});
