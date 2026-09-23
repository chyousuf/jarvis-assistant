import { getDatabase } from '../db/database.js';

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'personal' | 'project' | 'fact';
  approved: number;
  created_at: string;
  updated_at: string;
}

/**
 * Saves or updates a memory entry
 */
export async function saveMemory(key: string, value: string, category: 'preference' | 'personal' | 'project' | 'fact' = 'preference'): Promise<MemoryItem> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const normalizedKey = key.trim().toLowerCase();

  // Check if exists
  const existing = db.prepare('SELECT * FROM memories WHERE key = ?').get(normalizedKey) as unknown as MemoryItem | undefined;

  if (existing) {
    db.prepare(`
      UPDATE memories
      SET value = ?, category = ?, updated_at = ?
      WHERE id = ?
    `).run(value, category, now, existing.id);

    return {
      ...existing,
      value,
      category,
      updated_at: now
    };
  }

  const id = `mem-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO memories (id, key, value, category, approved, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(id, normalizedKey, value, category, now, now);

  return {
    id,
    key: normalizedKey,
    value,
    category,
    approved: 1,
    created_at: now,
    updated_at: now
  };
}

/**
 * List all memories
 */
export async function listMemories(): Promise<MemoryItem[]> {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM memories ORDER BY updated_at DESC');
  return stmt.all() as unknown as MemoryItem[];
}

/**
 * Delete a memory by id or key
 */
export async function deleteMemory(idOrKey: string): Promise<boolean> {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM memories WHERE id = ? OR key = ?');
  const res = stmt.run(idOrKey, idOrKey.toLowerCase());
  return (res as any).changes > 0;
}

/**
 * Get relevant memories for prompt context injection
 */
export function getMemoriesContext(): string {
  const db = getDatabase();
  const stmt = db.prepare('SELECT key, value, category FROM memories WHERE approved = 1');
  const items = stmt.all() as unknown as Array<{ key: string; value: string; category: string }>;

  if (items.length === 0) return '';

  return items.map(m => `- [${m.category.toUpperCase()}] ${m.key}: ${m.value}`).join('\n');
}
