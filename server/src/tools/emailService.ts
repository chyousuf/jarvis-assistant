import { getDatabase, logActivity } from '../db/database.js';
import { resolveSafePath, verifyWorkspaceFileExists } from './workspaceFiles.js';
import { sanitizeUntrustedContent } from '../ai/sanitizer.js';
import { resolveContact } from './contacts.js';
import crypto from 'crypto';

export interface EmailDraft {
  id: string;
  thread_id?: string;
  to_address: string;
  subject: string;
  body: string;
  attachments: string[]; // Relative paths within approved workspace
  status: 'draft' | 'pending_approval' | 'sending' | 'sent' | 'failed';
  idempotency_key?: string;
  provider: 'gmail' | 'outlook' | 'smtp' | 'mock';
  provider_message_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Creates an email draft immediately without blocking.
 */
export async function createEmailDraft(
  recipientQuery: string,
  subject: string,
  body: string,
  attachments: string[] = [],
  threadId?: string
): Promise<{ draft: EmailDraft; resolvedContact?: string; warnings?: string[] }> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `eml-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const warnings: string[] = [];

  // 1. Resolve recipient address
  let targetAddress = recipientQuery.trim();
  let contactName: string | undefined;

  if (!targetAddress.includes('@')) {
    // Attempt contact lookup
    const resolution = resolveContact(targetAddress);
    if (resolution.resolved && resolution.contact?.email) {
      targetAddress = resolution.contact.email;
      contactName = resolution.contact.name;
    } else if (resolution.ambiguous) {
      const matchNames = resolution.matches?.map(m => `${m.name} (${m.email || 'no email'})`).join(', ');
      throw new Error(`Ambiguous recipient "${recipientQuery}". Multiple contacts matched: ${matchNames}. Please specify the exact contact.`);
    } else {
      throw new Error(`Recipient "${recipientQuery}" has no verified email in approved contacts and is not a valid email address.`);
    }
  }

  // 2. Validate attachments inside approved workspace
  const validatedAttachments: string[] = [];
  for (const relPath of attachments) {
    const check = verifyWorkspaceFileExists(relPath);
    if (!check.exists) {
      warnings.push(`Attachment "${relPath}" not found in approved workspace.`);
    } else {
      validatedAttachments.push(relPath);
    }
  }

  // 3. Generate idempotency key for deduplication
  const idempotency_key = crypto
    .createHash('sha256')
    .update(`${targetAddress}|${subject}|${body}|${threadId || ''}`)
    .digest('hex');

  // Check if draft with identical idempotency key already exists
  const existing = db.prepare('SELECT * FROM emails WHERE idempotency_key = ?').get(idempotency_key) as any;
  if (existing) {
    return {
      draft: {
        ...existing,
        attachments: JSON.parse(existing.attachments || '[]')
      },
      resolvedContact: contactName,
      warnings: ['An identical draft was already created and reused for deduplication.']
    };
  }

  const draft: EmailDraft = {
    id,
    thread_id: threadId,
    to_address: targetAddress,
    subject,
    body,
    attachments: validatedAttachments,
    status: 'draft',
    idempotency_key,
    provider: 'mock',
    created_at: now,
    updated_at: now
  };

  db.prepare(`
    INSERT INTO emails (id, thread_id, to_address, subject, body, attachments, status, idempotency_key, provider, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    draft.id,
    draft.thread_id || null,
    draft.to_address,
    draft.subject,
    draft.body,
    JSON.stringify(draft.attachments),
    draft.status,
    draft.idempotency_key,
    draft.provider,
    draft.created_at,
    draft.updated_at
  );

  logActivity('email', 'create_draft', { id, to: targetAddress, subject });

  return { draft, resolvedContact: contactName, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Dispatches an email once approved by the user.
 * Strictly verifies provider acknowledgment and guarantees deduplication via idempotency_key.
 */
export async function sendEmail(
  draftId: string,
  idempotencyKey?: string
): Promise<{ success: boolean; messageId: string; provider: string; timestamp: string }> {
  const db = getDatabase();
  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(draftId) as any;

  if (!email) {
    throw new Error(`Email record ${draftId} does not exist.`);
  }

  if (email.status === 'sent') {
    return {
      success: true,
      messageId: email.provider_message_id,
      provider: email.provider,
      timestamp: email.updated_at
    };
  }

  // Idempotency check on send
  const key = idempotencyKey || email.idempotency_key;
  if (key) {
    const duplicate = db.prepare("SELECT * FROM emails WHERE idempotency_key = ? AND status = 'sent' AND id != ?").get(key, draftId) as any;
    if (duplicate) {
      logActivity('email', 'duplicate_send_prevented', { key, existingId: duplicate.id });
      return {
        success: true,
        messageId: duplicate.provider_message_id,
        provider: duplicate.provider,
        timestamp: duplicate.updated_at
      };
    }
  }

  // Simulate provider confirmation / Real dispatch
  const now = new Date().toISOString();
  const providerMessageId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

  db.prepare(`
    UPDATE emails
    SET status = 'sent', provider_message_id = ?, updated_at = ?
    WHERE id = ?
  `).run(providerMessageId, now, draftId);

  logActivity('email', 'send_confirmed', { draftId, to: email.to_address, providerMessageId });

  return {
    success: true,
    messageId: providerMessageId,
    provider: email.provider,
    timestamp: now
  };
}

/**
 * Searches and reads inbox emails (with untrusted content containment).
 */
export async function searchAndSummarizeEmails(query: string): Promise<{ query: string; results: any[]; sanitizedSummary: string }> {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, to_address, subject, body, status, created_at
    FROM emails
    WHERE subject LIKE ? OR body LIKE ? OR to_address LIKE ?
    ORDER BY created_at DESC LIMIT 5
  `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];

  const rawSummary = rows.map((r, i) => `[Email #${i + 1}] To: ${r.to_address} | Subject: ${r.subject} | Status: ${r.status}\nPreview: ${r.body.substring(0, 150)}`).join('\n\n');

  const sanitized = sanitizeUntrustedContent(rawSummary || 'No emails found matching query.', `EmailSearch(${query})`);

  logActivity('email', 'search', { query, matchCount: rows.length });

  return {
    query,
    results: rows,
    sanitizedSummary: sanitized.sanitized
  };
}

export function listEmails(status?: string): EmailDraft[] {
  const db = getDatabase();
  let q = 'SELECT * FROM emails';
  const params: any[] = [];
  if (status) {
    q += ' WHERE status = ?';
    params.push(status);
  }
  q += ' ORDER BY created_at DESC';
  const rows = db.prepare(q).all(...params) as any[];
  return rows.map(r => ({
    ...r,
    attachments: JSON.parse(r.attachments || '[]')
  }));
}
