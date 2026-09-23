import { getDatabase } from '../db/database.js';

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
}

export interface ContactResolution {
  resolved: boolean;
  contact?: Contact;
  ambiguous?: boolean;
  matches?: Contact[];
  query: string;
}

/**
 * Resolves a recipient name against approved contacts.
 * Detects ambiguity if multiple contacts match.
 */
export function resolveContact(query: string): ContactResolution {
  const db = getDatabase();
  const clean = query.trim().toLowerCase();

  // 1. Check exact match
  const exact = db.prepare('SELECT * FROM contacts WHERE LOWER(name) = ?').get(clean) as Contact | undefined;
  if (exact) {
    return { resolved: true, contact: exact, query };
  }

  // 2. Check partial/contains match
  const partials = db.prepare('SELECT * FROM contacts WHERE LOWER(name) LIKE ?').all(`%${clean}%`) as Contact[];

  if (partials.length === 1) {
    return { resolved: true, contact: partials[0], query };
  }

  if (partials.length > 1) {
    return {
      resolved: false,
      ambiguous: true,
      matches: partials,
      query
    };
  }

  return {
    resolved: false,
    ambiguous: false,
    matches: [],
    query
  };
}

export function listContacts(): Contact[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM contacts ORDER BY name ASC').all() as Contact[];
}

export function addContact(name: string, email?: string, phone?: string, company?: string): Contact {
  const db = getDatabase();
  const id = `cnt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO contacts (id, name, email, phone, company, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, email || null, phone || null, company || null, now);

  return { id, name, email: email || null, phone: phone || null, company: company || null, created_at: now };
}
