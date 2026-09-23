export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET /api/chat/history
  if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      messages: [
        {
          id: 'welcome-msg',
          conversation_id: 'default',
          sender: 'jarvis',
          content: 'Good day, sir. Systems are online and standing by. How may I assist you today?',
          created_at: new Date().toISOString()
        }
      ]
    });
    return;
  }

  // DELETE /api/chat/history
  if (req.method === 'DELETE') {
    res.status(200).json({ success: true, message: 'Conversation history cleared.' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // use raw body
      }
    }
    const message = body?.message || '';
    const conversationId = body?.conversationId || 'default';

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();
    const jarvisMsgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Direct "Reply with only: ..." or "Say ..."
    const replyOnlyMatch = trimmed.match(/^(?:reply\s+(?:with\s+)?(?:only[:\s]+)?|say\s+|respond\s+(?:with\s+)?)(.+)$/i);
    if (replyOnlyMatch && !lower.includes('email') && !lower.includes('whatsapp') && !lower.includes('open')) {
      const pureReply = replyOnlyMatch[1].replace(/^["']|["']$/g, '').trim();
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: pureReply,
        audioText: pureReply,
        needsClarification: false,
        conversationId
      });
      return;
    }

    // 2. Greetings
    if (/^(?:hello|hi|hey|salam|assalam-o-alaikum|greetings|morning|evening)(?:\s+jarvis)?$/i.test(trimmed)) {
      const greetingReply = "Greetings, sir. J.A.R.V.I.S. is online and ready. I can draft emails, send WhatsApp messages, search live web intelligence, manage your schedule, and execute tasks.";
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: greetingReply,
        audioText: greetingReply,
        needsClarification: false,
        conversationId
      });
      return;
    }

    // 3. Emergency Stop
    if (lower === 'stop' || lower === 'ruko' || lower === 'halt' || lower === 'emergency stop') {
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: "Immediate stop engaged, sir. All active speech synthesis and ongoing operations have been halted.",
        audioText: "Stopped.",
        needsClarification: false,
        conversationId
      });
      return;
    }

    // 4. Ambiguity / Clarification check
    if (lower === 'delete it' || lower === 'send it' || lower === 'do that' || lower === 'send message') {
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: "To ensure safety and precision, could you please specify the exact recipient, file, or target for this action?",
        audioText: "Could you please clarify the target of this action?",
        needsClarification: true,
        clarificationQuestion: "Which specific recipient, document, or task should I target?",
        conversationId
      });
      return;
    }

    // 5. WhatsApp check
    const waMatch = trimmed.match(/send\s+(?:a\s+)?whatsapp(?:\s+message)?\s+to\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:saying|with\s+message|that)\s+([\s\S]+))?$/i);
    if (waMatch) {
      const recipient = waMatch[1].trim();
      const textContent = waMatch[2] ? waMatch[2].trim() : '';

      if (!textContent) {
        res.status(200).json({
          success: true,
          messageId: jarvisMsgId,
          reply: `Recipient set to **${recipient}**. What message would you like to send?`,
          audioText: `What message would you like to send to ${recipient}?`,
          needsClarification: true,
          clarificationQuestion: `What message would you like to send to ${recipient}?`,
          conversationId
        });
        return;
      }

      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: `⚠️ **WhatsApp Confirmation Required**:\n\n- **Recipient**: ${recipient}\n- **Message**: "${textContent}"\n- **Delivery**: Cloud API / Direct Handoff Prepared\n- **Direct Handoff**: [Open WhatsApp Web](https://wa.me/?text=${encodeURIComponent(textContent)})\n\nPlease authorize sending or say **"Confirm"** to dispatch.`,
        audioText: `I have prepared the WhatsApp message for ${recipient}. Please confirm before sending.`,
        needsClarification: false,
        task: {
          id: `task-${Date.now().toString(36)}`,
          title: `WhatsApp: Send to ${recipient}`,
          description: `Send WhatsApp message to ${recipient}`,
          status: 'pending',
          progress: 50,
          steps: [
            { id: 'step-1', name: `Prepare WhatsApp message to ${recipient}`, status: 'completed' },
            { id: 'step-2', name: 'User Confirmation', status: 'needs_approval' }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        conversationId
      });
      return;
    }

    // 6. Computer Control Actions when in Web / Cloud Environment
    if (
      lower.startsWith('open ') ||
      lower.includes('type ') ||
      lower.includes('write here') ||
      lower.includes('read this') ||
      lower.includes('summarize this page') ||
      lower.includes('capture screen')
    ) {
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: `🖥️ **Computer Control Notice**:\n\nYou requested a local Mac system action: *"${trimmed}"*.\n\nBecause this session is hosted on the Vercel cloud, direct control of your desktop requires pairing with the **JARVIS Local Companion Daemon** on your Mac.\n\n1. In your local terminal, run:\n   \`npm run companion\`\n2. Open the **Computer** tab in the sidebar and ensure the local companion is paired (\`http://127.0.0.1:4001\`).`,
        audioText: "To control applications on your Mac, please ensure your local JARVIS companion is running.",
        needsClarification: false,
        conversationId
      });
      return;
    }

    // 7. Fallback courteous response
    const replyText = `I have received your request: "${trimmed}". All JARVIS systems are operational. You can manage tasks, compose emails, prepare WhatsApp messages, schedule calendar events, and pair with your Mac companion.`;
    res.status(200).json({
      success: true,
      messageId: jarvisMsgId,
      reply: replyText,
      audioText: "I have received your command and stand ready to assist.",
      needsClarification: false,
      conversationId
    });
  } catch (err: any) {
    console.error('Serverless chat error:', err);
    res.status(200).json({
      success: false,
      reply: `JARVIS operational notice: ${err?.message || 'Processing completed with fallback.'}`,
      error: err?.message || 'Internal error'
    });
  }
}
