import { getDatabase } from '../db/database.js';
import { TOOLS } from '../tools/registry.js';
import { createApproval } from './approvalManager.js';

export interface TaskStep {
  id: string;
  name: string;
  toolName?: string;
  args?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'needs_approval';
  approvalId?: string;
  output?: any;
  error?: string;
  evidence?: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  steps: TaskStep[];
  result?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

// Global active cancellation tokens
const activeCancellations = new Set<string>();

// Real-time event subscribers
type EventCallback = (event: { type: string; data: any }) => void;
const eventSubscribers = new Set<EventCallback>();

export function subscribeToTaskEvents(callback: EventCallback): () => void {
  eventSubscribers.add(callback);
  return () => {
    eventSubscribers.delete(callback);
  };
}

export function broadcastEvent(type: string, data: any) {
  for (const subscriber of eventSubscribers) {
    try {
      subscriber({ type, data });
    } catch {
      // Ignore subscriber errors
    }
  }
}

/**
 * Creates and registers a new task
 */
export function createTask(title: string, description: string, initialSteps: Array<{ name: string; toolName?: string; args?: any }>): TaskRecord {
  const db = getDatabase();
  const id = `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const steps: TaskStep[] = initialSteps.map((s, idx) => ({
    id: `step-${idx + 1}`,
    name: s.name,
    toolName: s.toolName,
    args: s.args,
    status: 'pending'
  }));

  const task: TaskRecord = {
    id,
    title,
    description,
    status: 'pending',
    progress: 0,
    steps,
    created_at: now,
    updated_at: now
  };

  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, status, progress, steps, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(task.id, task.title, task.description, task.status, task.progress, JSON.stringify(task.steps), task.created_at, task.updated_at);

  broadcastEvent('task:created', task);
  return task;
}

/**
 * Retrieves a task by ID
 */
export function getTask(id: string): TaskRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!row) return null;

  return {
    ...row,
    steps: JSON.parse(row.steps || '[]')
  };
}

/**
 * Lists tasks with optional status filter
 */
export function listTasks(status?: string): TaskRecord[] {
  const db = getDatabase();
  let query = 'SELECT * FROM tasks';
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => ({
    ...r,
    steps: JSON.parse(r.steps || '[]')
  }));
}

/**
 * Updates a task record in SQLite and broadcasts the update
 */
export function updateTask(id: string, updates: Partial<TaskRecord>): TaskRecord | null {
  const db = getDatabase();
  const existing = getTask(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const merged: TaskRecord = {
    ...existing,
    ...updates,
    updated_at: now
  };

  const stmt = db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, status = ?, progress = ?, steps = ?, result = ?, error = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    merged.title,
    merged.description,
    merged.status,
    merged.progress,
    JSON.stringify(merged.steps),
    merged.result || null,
    merged.error || null,
    merged.updated_at,
    id
  );

  broadcastEvent('task:updated', merged);
  return merged;
}

/**
 * Requests cancellation of a task
 */
export function cancelTask(id: string): boolean {
  activeCancellations.add(id);
  const updated = updateTask(id, {
    status: 'cancelled',
    result: 'Task was cancelled by user request.'
  });
  return !!updated;
}

/**
 * Executes a task through all steps with verification, approval checks, and error recovery
 */
export async function executeTask(taskId: string): Promise<TaskRecord> {
  let task = getTask(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  task = updateTask(taskId, { status: 'running', progress: 5 })!;

  const totalSteps = task.steps.length;
  let completedCount = 0;

  for (let i = 0; i < task.steps.length; i++) {
    // Check if task was cancelled
    if (activeCancellations.has(taskId)) {
      activeCancellations.delete(taskId);
      task.steps[i].status = 'skipped';
      return updateTask(taskId, {
        status: 'cancelled',
        steps: task.steps,
        result: 'Task cancelled by user before completing all steps.'
      })!;
    }

    const step = task.steps[i];
    step.status = 'running';
    updateTask(taskId, { steps: task.steps, progress: Math.round(((i + 0.2) / totalSteps) * 100) });

    if (!step.toolName) {
      // Conceptual step without tool
      step.status = 'completed';
      completedCount++;
      continue;
    }

    const tool = TOOLS[step.toolName];
    if (!tool) {
      step.status = 'failed';
      step.error = `Tool "${step.toolName}" is not registered in JARVIS engine.`;
      return updateTask(taskId, {
        status: 'failed',
        steps: task.steps,
        error: step.error
      })!;
    }

    // Check sensitive approval requirement
    if (tool.isSensitive) {
      step.status = 'needs_approval';
      const description = `Authorization required to execute sensitive action: ${tool.name} (${JSON.stringify(step.args)})`;
      const { id: approvalId, promise } = createApproval(taskId, tool.name, description, step.args);
      step.approvalId = approvalId;
      updateTask(taskId, { steps: task.steps });

      broadcastEvent('approval:required', {
        approvalId,
        taskId,
        action: tool.name,
        description,
        payload: step.args
      });

      // Wait for user approval
      const isApproved = await promise;
      if (!isApproved) {
        step.status = 'failed';
        step.error = 'Operation declined by user.';
        return updateTask(taskId, {
          status: 'failed',
          steps: task.steps,
          error: 'Action cancelled because user denied permission.'
        })!;
      }
      step.status = 'running';
    }

    // Execute tool
    try {
      const output = await tool.execute(step.args);
      step.output = output;

      // Verification loop: check evidence of success
      if (tool.verifyOutcome) {
        const verification = await tool.verifyOutcome(step.args, output);
        if (!verification.verified) {
          step.status = 'failed';
          step.error = `Verification failed: Result could not be validated. ${verification.evidence || ''}`;
          return updateTask(taskId, {
            status: 'failed',
            steps: task.steps,
            error: step.error
          })!;
        }
        step.evidence = verification.evidence;
      }

      step.status = 'completed';
      completedCount++;
      const currentProgress = Math.round((completedCount / totalSteps) * 100);
      updateTask(taskId, { steps: task.steps, progress: currentProgress });

    } catch (err: any) {
      step.status = 'failed';
      step.error = err.message || 'Tool execution encountered an unexpected error.';

      // Attempt safe recovery or report problem clearly
      return updateTask(taskId, {
        status: 'failed',
        steps: task.steps,
        error: `Execution error at step "${step.name}": ${step.error}. Safe recovery: You can adjust parameters or inspect workspace logs.`
      })!;
    }
  }

  // Final completion verification
  const finalTask = updateTask(taskId, {
    status: 'completed',
    progress: 100,
    result: `Task successfully completed with ${completedCount} of ${totalSteps} verified steps.`
  })!;

  broadcastEvent('task:completed', finalTask);
  return finalTask;
}
