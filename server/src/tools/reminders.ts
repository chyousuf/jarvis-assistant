import { getDatabase } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface Reminder {
  id: string;
  title: string;
  due_at: string;
  status: 'pending' | 'fired' | 'cancelled';
  notification_sent: number;
  created_at: string;
}

/**
 * Creates a persistent reminder in SQLite
 */
export async function createReminder(title: string, dueAtStringOrRelative: string): Promise<Reminder> {
  const db = getDatabase();
  const id = `rem-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date();

  let dueAt: Date;

  // Parse natural relative time formats e.g. "in 5 minutes", "in 1 hour", "in 30 seconds"
  const relativeMatch = dueAtStringOrRelative.match(/in\s+(\d+)\s+(second|sec|minute|min|hour|hr|day)s?/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    dueAt = new Date(now.getTime());

    if (unit.startsWith('sec')) dueAt.setSeconds(dueAt.getSeconds() + amount);
    else if (unit.startsWith('min')) dueAt.setMinutes(dueAt.getMinutes() + amount);
    else if (unit.startsWith('hour') || unit.startsWith('hr')) dueAt.setHours(dueAt.getHours() + amount);
    else if (unit.startsWith('day')) dueAt.setDate(dueAt.getDate() + amount);
  } else {
    // Try standard ISO or parseable date string
    const parsed = new Date(dueAtStringOrRelative);
    if (!isNaN(parsed.getTime())) {
      dueAt = parsed;
    } else {
      // Default to 10 minutes from now if unparseable
      dueAt = new Date(now.getTime() + 10 * 60 * 1000);
    }
  }

  const reminder: Reminder = {
    id,
    title,
    due_at: dueAt.toISOString(),
    status: 'pending',
    notification_sent: 0,
    created_at: now.toISOString()
  };

  const stmt = db.prepare(`
    INSERT INTO reminders (id, title, due_at, status, notification_sent, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(reminder.id, reminder.title, reminder.due_at, reminder.status, reminder.notification_sent, reminder.created_at);

  return reminder;
}

/**
 * Lists reminders, optionally filtered by status
 */
export async function listReminders(status?: 'pending' | 'fired' | 'cancelled'): Promise<Reminder[]> {
  const db = getDatabase();
  let query = 'SELECT * FROM reminders';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY due_at ASC';

  const stmt = db.prepare(query);
  return stmt.all(...params) as unknown as Reminder[];
}

/**
 * Cancels a reminder
 */
export async function cancelReminder(id: string): Promise<boolean> {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE reminders SET status = ? WHERE id = ?');
  const res = stmt.run('cancelled', id);
  return (res as any).changes > 0;
}

/**
 * Checks and returns reminders that have become due, updating them to 'fired'
 */
export function pollDueReminders(): Reminder[] {
  const db = getDatabase();
  const now = new Date().toISOString();

  const selectStmt = db.prepare(`
    SELECT * FROM reminders
    WHERE status = 'pending' AND due_at <= ?
  `);

  const due = selectStmt.all(now) as unknown as Reminder[];

  if (due.length > 0) {
    const updateStmt = db.prepare(`
      UPDATE reminders
      SET status = 'fired', notification_sent = 1
      WHERE id = ?
    `);

    for (const rem of due) {
      updateStmt.run(rem.id);
      rem.status = 'fired';
      rem.notification_sent = 1;
    }
  }

  return due;
}
