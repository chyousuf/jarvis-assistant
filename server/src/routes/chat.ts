import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { orchestrator } from '../ai/orchestrator.js';

const router = Router();

/**
 * Send a chat message (text or voice-transcribed)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Passcode Protection (if JARVIS_ACCESS_PASSCODE is set in environment)
    const serverPasscode = process.env.JARVIS_ACCESS_PASSCODE;
    if (serverPasscode) {
      const providedPasscode = (req.headers['x-jarvis-passcode'] as string) || req.body?.passcode || req.query?.passcode;
      if (providedPasscode !== serverPasscode) {
        res.status(401).json({
          success: false,
          error: 'PASSCODE_REQUIRED',
          message: 'This personal JARVIS deployment is protected. Please enter the access passcode in the Connections tab.'
        });
        return;
      }
    }

    const { message, conversationId = 'default' } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const clientKey = (req.headers['x-ai-api-key'] as string) || req.body?.aiApiKey;
    const clientProvider = (req.headers['x-ai-provider'] as string) || req.body?.aiProvider;

    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure conversation exists
    const conv = db.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId);
    if (!conv) {
      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(conversationId, message.substring(0, 40), now, now);
    }

    // Save user message
    const userMsgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender, content, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(userMsgId, conversationId, message, now);

    // Fetch recent history (exclude the newly inserted message so it doesn't duplicate)
    const historyRows = db.prepare(`
      SELECT sender as role, content FROM messages
      WHERE conversation_id = ? AND id != ?
      ORDER BY created_at ASC LIMIT 20
    `).all(conversationId, userMsgId) as any[];

    const clientHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const effectiveHistory = historyRows && historyRows.length > 0 ? historyRows : clientHistory;

    // Process through JARVIS Orchestrator
    const result = await orchestrator.processUserMessage(
      message,
      effectiveHistory,
      clientKey,
      clientProvider,
      req.body?.learningContext
    );

    // Save assistant reply
    const jarvisMsgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender, content, tool_calls, created_at)
      VALUES (?, ?, 'jarvis', ?, ?, ?)
    `).run(
      jarvisMsgId,
      conversationId,
      result.reply,
      result.task ? JSON.stringify(result.task) : null,
      new Date().toISOString()
    );

    res.json({
      success: true,
      messageId: jarvisMsgId,
      reply: result.reply,
      audioText: result.audioText || result.reply,
      needsClarification: result.needsClarification,
      clarificationQuestion: result.clarificationQuestion,
      task: result.task,
      memorySaved: result.memorySaved,
      appliedCorrection: result.appliedCorrection,
      citations: result.citations
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Internal server error processing message' });
  }
});

/**
 * Get conversation history
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const { conversationId = 'default' } = req.query;
    const db = getDatabase();

    const messages = db.prepare(`
      SELECT id, conversation_id, sender, content, tool_calls, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(conversationId as string) as any[];

    const formatted = messages.map(m => ({
      ...m,
      tool_calls: m.tool_calls ? JSON.parse(m.tool_calls) : null
    }));

    res.json({ success: true, messages: formatted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Clear history
 */
router.delete('/history', (req: Request, res: Response) => {
  try {
    const { conversationId = 'default' } = req.query;
    const db = getDatabase();
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId as string);
    res.json({ success: true, message: 'Conversation history cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
