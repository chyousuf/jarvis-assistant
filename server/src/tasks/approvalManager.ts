import { getDatabase } from '../db/database.js';

export interface ApprovalRequest {
  id: string;
  task_id: string;
  action_type: string;
  description: string;
  payload: any;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at?: string;
}

// Memory map for resolving waiting promises
const pendingResolvers = new Map<string, { resolve: (val: boolean) => void }>();

/**
 * Creates an approval request and optionally awaits user response if asynchronous resolver registered
 */
export function createApproval(
  taskId: string,
  actionType: string,
  description: string,
  payload: any
): { id: string; promise: Promise<boolean> } {
  const db = getDatabase();
  const id = `appr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO approvals (id, task_id, action_type, description, payload, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `);

  stmt.run(id, taskId, actionType, description, JSON.stringify(payload), now);

  const promise = new Promise<boolean>((resolve) => {
    pendingResolvers.set(id, { resolve });
  });

  return { id, promise };
}

/**
 * Lists pending or historical approvals
 */
export function listApprovals(status?: 'pending' | 'approved' | 'rejected'): ApprovalRequest[] {
  const db = getDatabase();
  let query = 'SELECT * FROM approvals';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(r => ({
    ...r,
    payload: JSON.parse(r.payload || '{}')
  }));
}

/**
 * Resolves an approval request (approved or rejected by user)
 */
export function resolveApproval(id: string, decision: 'approved' | 'rejected'): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE approvals
    SET status = ?, resolved_at = ?
    WHERE id = ? AND status = 'pending'
  `);

  const res = stmt.run(decision, now, id);
  const updated = (res as any).changes > 0;

  if (updated && pendingResolvers.has(id)) {
    const resolver = pendingResolvers.get(id);
    if (resolver) {
      resolver.resolve(decision === 'approved');
      pendingResolvers.delete(id);
    }
  }

  return updated;
}
