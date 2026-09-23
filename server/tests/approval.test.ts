import test from 'node:test';
import assert from 'node:assert';
import { createApproval, listApprovals, resolveApproval } from '../src/tasks/approvalManager.js';
import { createTask, executeTask, cancelTask } from '../src/tasks/taskRunner.js';

test('Approval Gate: Creates pending approval and awaits decision', async () => {
  const taskId = 'task-test-approve-1';
  const actionType = 'email_send';
  const description = 'Send quarterly report to board@company.com';
  const payload = { to: 'board@company.com', subject: 'Report' };

  const { id: approvalId, promise } = createApproval(taskId, actionType, description, payload);
  assert.ok(approvalId);

  // Check pending list
  const pending = listApprovals('pending');
  const found = pending.find(a => a.id === approvalId);
  assert.ok(found);
  assert.strictEqual(found.status, 'pending');
  assert.strictEqual(found.action_type, 'email_send');

  // Asynchronously approve
  setTimeout(() => {
    resolveApproval(approvalId, 'approved');
  }, 50);

  const decision = await promise;
  assert.strictEqual(decision, true);

  // Check updated status
  const allApprovals = listApprovals();
  const updated = allApprovals.find(a => a.id === approvalId);
  assert.strictEqual(updated?.status, 'approved');
});

test('Task Lifecycle: Task creation and user cancellation', async () => {
  const task = createTask('Long Running Computation', 'Performs analysis', [
    { name: 'Initial scan', toolName: 'workspace_file_list' }
  ]);

  assert.strictEqual(task.status, 'pending');

  // Cancel task
  const cancelled = cancelTask(task.id);
  assert.strictEqual(cancelled, true);

  // Run should stop due to cancellation
  const final = await executeTask(task.id);
  assert.strictEqual(final.status, 'cancelled');
});
