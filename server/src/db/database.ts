import { DatabaseSync } from 'node:sqlite';
import { DB_PATH, GMAIL_CONFIG, OUTLOOK_CONFIG, WHATSAPP_CONFIG } from '../config.js';
import fs from 'fs';
import path from 'path';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(dbFilePath = DB_PATH): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbFilePath);

  // Enable WAL mode & foreign keys for high-performance concurrent operations
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      tool_results TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL, -- pending, running, completed, failed, cancelled
      progress INTEGER NOT NULL DEFAULT 0,
      steps TEXT, -- JSON array of steps
      result TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, fired, cancelled
      notification_sent INTEGER NOT NULL DEFAULT 0,
      timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'preference', -- preference, personal, project, fact
      approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      action_type TEXT NOT NULL, -- email_send, whatsapp_send, calendar_invite, file_delete, spend_money
      description TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON
      status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'demo', -- connected, demo, unavailable
      config TEXT, -- JSON
      permissions TEXT, -- JSON array of scopes
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      thread_id TEXT,
      to_address TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      attachments TEXT, -- JSON array of file paths
      status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_approval, sent, failed
      idempotency_key TEXT UNIQUE,
      provider TEXT NOT NULL DEFAULT 'mock', -- gmail, outlook, mock
      provider_message_id TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      contact_id TEXT,
      recipient_phone TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      message_text TEXT NOT NULL,
      template_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending_approval', -- pending_approval, accepted, sent, delivered, read, failed, handoff_prepared
      idempotency_key TEXT UNIQUE,
      provider_message_id TEXT,
      handoff_url TEXT,
      delivery_details TEXT, -- JSON
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      attendees TEXT, -- JSON array of emails
      timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
      status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, pending_confirmation, cancelled
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL, -- email, whatsapp, calendar, file, system, auth
      action TEXT NOT NULL,
      details TEXT, -- Sanitized JSON (no tokens)
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider TEXT PRIMARY KEY, -- google, microsoft
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT NOT NULL,
      scopes TEXT NOT NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_reminders_status_due ON reminders(status, due_at);
    CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
    CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
    CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_status ON whatsapp_messages(status);
    CREATE INDEX IF NOT EXISTS idx_calendar_time ON calendar_events(start_time, end_time);
  `);

  // Seed default integrations with explicit permissions and credentials status
  const count = db.prepare('SELECT count(*) as count FROM integrations').get() as { count: number };
  if (count.count === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO integrations (id, name, type, status, config, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // WhatsApp Cloud API
    const waConnected = !!(WHATSAPP_CONFIG.phoneNumberId && WHATSAPP_CONFIG.accessToken);
    insert.run(
      'int-whatsapp',
      'Meta WhatsApp Business Platform (Cloud API)',
      'whatsapp',
      waConnected ? 'connected' : 'demo',
      JSON.stringify({
        phoneNumberId: WHATSAPP_CONFIG.phoneNumberId || 'Pending Setup (Meta Cloud API)',
        businessAccountId: WHATSAPP_CONFIG.businessAccountId || 'Not Configured',
        supportedHandoffUrl: 'https://wa.me/'
      }),
      JSON.stringify(['whatsapp_business_messaging', 'whatsapp_business_management']),
      now,
      now
    );

    // Gmail OAuth
    const gmailConnected = !!GMAIL_CONFIG.clientId;
    insert.run(
      'int-gmail',
      'Google Gmail (OAuth 2.0)',
      'email',
      gmailConnected ? 'connected' : 'demo',
      JSON.stringify({
        clientId: GMAIL_CONFIG.clientId ? 'Configured (OAuth2 Client ID)' : 'Not Configured',
        authUrl: '/api/oauth/google/authorize'
      }),
      JSON.stringify(['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.readonly']),
      now,
      now
    );

    // Microsoft 365 Outlook OAuth
    const outlookConnected = !!OUTLOOK_CONFIG.clientId;
    insert.run(
      'int-outlook',
      'Microsoft Outlook 365 (Graph OAuth 2.0)',
      'email',
      outlookConnected ? 'connected' : 'demo',
      JSON.stringify({
        clientId: OUTLOOK_CONFIG.clientId ? 'Configured (Entra App ID)' : 'Not Configured',
        authUrl: '/api/oauth/microsoft/authorize'
      }),
      JSON.stringify(['Mail.Send', 'Mail.ReadWrite', 'Calendars.ReadWrite']),
      now,
      now
    );

    // Google Calendar
    insert.run(
      'int-cal',
      'Calendar Scheduling Service',
      'calendar',
      'connected',
      JSON.stringify({ provider: 'internal_calendar', timezone: 'Asia/Karachi' }),
      JSON.stringify(['calendar.events.freebusy', 'calendar.events.write']),
      now,
      now
    );

    // DuckDuckGo Search
    insert.run(
      'int-search',
      'DuckDuckGo Live Web Research',
      'search',
      'connected',
      JSON.stringify({ provider: 'duckduckgo', live: true }),
      JSON.stringify(['web.search', 'web.scrape']),
      now,
      now
    );

    // Sandboxed Storage
    insert.run(
      'int-storage',
      'Sandboxed Workspace Storage',
      'storage',
      'connected',
      JSON.stringify({ path: 'workspace/', isolated: true }),
      JSON.stringify(['workspace.read', 'workspace.write']),
      now,
      now
    );
  }

  // Seed default approved contacts if empty
  const contactCount = db.prepare('SELECT count(*) as count FROM contacts').get() as { count: number };
  if (contactCount.count === 0) {
    const now = new Date().toISOString();
    const insertContact = db.prepare(`
      INSERT INTO contacts (id, name, email, phone, company, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertContact.run('cnt-1', 'Ahmed Raza', 'ahmed.raza@example.com', '+923001234567', 'Nexus Tech', now);
    insertContact.run('cnt-2', 'Ahmed Khan', 'ahmed.khan@example.com', '+923219876543', 'Alpha Solutions', now);
    insertContact.run('cnt-3', 'Ali Hassan', 'ali.hassan@example.com', '+923335551234', 'DevStudio', now);
    insertContact.run('cnt-4', 'Sarah Miller', 'sarah@example.com', '+14155552671', 'CloudCorp', now);
  }

  dbInstance = db;
  return dbInstance;
}

export function logActivity(category: string, action: string, details?: any) {
  try {
    const db = getDatabase();
    const id = `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Sanitize details to guarantee no secrets/tokens are logged
    const safeDetails = details ? JSON.parse(JSON.stringify(details, (k, v) => {
      if (/token|secret|password|key|authorization/i.test(k)) return '[REDACTED]';
      return v;
    })) : null;

    db.prepare(`
      INSERT INTO activity_logs (id, category, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, category, action, safeDetails ? JSON.stringify(safeDetails) : null, now);
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

export function getActivityLogs(limit = 50) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
}
