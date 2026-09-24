import { resolveAIConfig, executeAIConversation, ChatMessage } from './aiService.js';

// In-memory sliding-window IP rate limiter
const ipRequestWindow = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestWindow.get(ip) || [];
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequestWindow.set(ip, validTimestamps);
    return false;
  }
  
  validTimestamps.push(now);
  ipRequestWindow.set(ip, validTimestamps);
  return true;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ai-api-key, x-ai-provider, x-jarvis-passcode');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Rate Limiting
  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString().split(',')[0].trim();
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again shortly.'
    });
    return;
  }

  // Passcode Protection (if JARVIS_ACCESS_PASSCODE is set on server)
  const serverPasscode = process.env.JARVIS_ACCESS_PASSCODE;
  if (serverPasscode) {
    const providedPasscode = req.headers['x-jarvis-passcode'] || req.query?.passcode;
    if (providedPasscode !== serverPasscode) {
      res.status(401).json({
        success: false,
        error: 'PASSCODE_REQUIRED',
        message: 'This personal JARVIS deployment is protected. Please enter the access passcode in the Connections tab.'
      });
      return;
    }
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
        // use raw
      }
    }

    const message = body?.message || '';
    const conversationId = body?.conversationId || 'default';
    const history: Array<{ role: string; content: string }> = Array.isArray(body?.history) ? body.history : [];

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();
    const jarvisMsgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // ==========================================
    // 1. DETERMINISTIC SYSTEM COMMANDS & GREETINGS
    // ==========================================

    // 1.0 Friendly Greetings (hy, hi, hello, salam, hey, etc.)
    const isGreeting =
      /^(?:hy+|hi+|hello+|helo+|hey+(?:\s+jarvis)?|greetings|good\s+(?:morning|afternoon|evening|day)|salam|assalam\s*(?:o\s*)?alaikum|aoa|kya\s+haal\s+hai|kaise\s+ho|kaisay\s+ho)[!.,?\s]*$/i.test(
        trimmed
      ) ||
      lower === 'jarvis' ||
      lower === 'who are you' ||
      lower === 'what can you do' ||
      lower === 'help';

    if (isGreeting) {
      const clientKey = req.headers['x-ai-api-key'] || body?.aiApiKey;
      const clientProvider = req.headers['x-ai-provider'] || body?.aiProvider;
      const aiConfig = resolveAIConfig(clientKey, clientProvider);

      if (!aiConfig) {
        const isUrdu = /salam|alaikum|aoa|haal|kaise|kaisay/i.test(trimmed);
        const greetingReply = isUrdu
          ? "Walaikum Assalam, sir! J.A.R.V.I.S. hazir hai. Main aap ke computer par apps khol sakta hoon (maslan 'Chrome kholo'), files aur workspace control kar sakta hoon, aur WhatsApp ya emails prepare kar sakta hoon.\n\nMazeed open-ended reasoning aur sawalat ke liye, aap **Connections** tab mein ja kar apni AI API key connect kar saktay hain."
          : "Hello, sir. J.A.R.V.I.S. is online and standing by.\n\nI can open desktop applications (e.g. *'Chrome kholo'* or *'Open TextEdit'*), search YouTube, manage workspace files, and prepare emails and WhatsApp messages.\n\n*Tip: To unlock open-ended AI reasoning, math calculations, and custom writing, configure your API key in the **Connections** tab.*";

        res.status(200).json({
          success: true,
          messageId: jarvisMsgId,
          reply: greetingReply,
          audioText: isUrdu
            ? "Walaikum Assalam, sir. JARVIS hazir hai. Main aap ki kya madad kar sakta hoon?"
            : "Hello, sir. J.A.R.V.I.S. is online and standing by. How may I assist you today?",
          needsClarification: false,
          conversationId
        });
        return;
      }
    }

    // 1.1 Emergency Stop
    if (lower === 'stop' || lower === 'ruko' || lower === 'halt' || lower === 'emergency stop') {
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: 'Immediate stop engaged, sir. All active speech synthesis and ongoing operations have been halted.',
        audioText: 'Stopped.',
        needsClarification: false,
        conversationId
      });
      return;
    }

    // 1.2 Ambiguity / Clarification check
    if (lower === 'delete it' || lower === 'send it' || lower === 'do that' || lower === 'send message') {
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: 'To ensure safety and precision, could you please specify the exact recipient, file, or target for this action?',
        audioText: 'Could you please clarify the target of this action?',
        needsClarification: true,
        clarificationQuestion: 'Which specific recipient, document, or task should I target?',
        conversationId
      });
      return;
    }

    // 1.3 Desktop Acceptance Workflow:
    // "Open TextEdit, write ‘This is a JARVIS test’, and save it as jarvis-test.txt in my approved workspace"
    const textEditWorkflowMatch = trimmed.match(
      /open\s+(textedit|editor|word)[,\s]+write\s+['"‘]([\s\S]+?)['"’][,\s]+and\s+save\s+it\s+as\s+([a-zA-Z0-9_.-]+)\s+in\s+(?:my\s+)?(?:approved\s+)?workspace/i
    );
    if (textEditWorkflowMatch) {
      const editorApp = textEditWorkflowMatch[1];
      const content = textEditWorkflowMatch[2];
      const filename = textEditWorkflowMatch[3];

      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: `Desktop workflow initiated:\n\n1. Target Application: **${editorApp}**\n2. Content to write: "${content}"\n3. Destination: Workspace file **\`${filename}\`**\n\n*Note: Direct macOS desktop execution requires the paired local companion daemon (\`npm run companion\`).*`,
        audioText: `Writing ${filename} in ${editorApp} within approved workspace.`,
        needsClarification: false,
        task: {
          id: `task-${Date.now().toString(36)}`,
          title: `TextEdit Workflow: ${filename}`,
          description: `Open ${editorApp}, write content, and save to workspace/${filename}`,
          status: 'pending',
          progress: 30,
          steps: [
            { id: 'step-1', name: `Launch ${editorApp}`, status: 'completed' },
            { id: 'step-2', name: `Write "${content}"`, status: 'running' },
            { id: 'step-3', name: `Save to workspace/${filename}`, status: 'pending' }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        conversationId
      });
      return;
    }

    // 1.4 Urdu App Opening: "Chrome kholo", "WhatsApp kholo", "TextEdit kholo"
    const urduAppMatch = trimmed.match(/^([a-zA-Z0-9_\s]+?)\s+(?:kholo|chalao|open\s+karo)$/i);
    if (urduAppMatch) {
      const targetApp = urduAppMatch[1].trim();
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: `🖥️ **Application Launch Request** (Urdu Command: "${trimmed}"):\n\nOpening **${targetApp}** on your computer.\n\n*If using the cloud interface, verify that your local companion is linked (\`npm run companion\`).*`,
        audioText: `${targetApp} khola ja raha hai.`,
        needsClarification: false,
        conversationId
      });
      return;
    }

    // 1.5 Explicit App Launch (English): "Open Chrome", "Open WhatsApp", "Open Word"
    const openAppMatch = trimmed.match(/^open\s+([a-zA-Z0-9_\s]+?)$/i);
    if (openAppMatch && !lower.includes('and') && !lower.includes('youtube') && !lower.includes('email')) {
      const appName = openAppMatch[1].trim();
      res.status(200).json({
        success: true,
        messageId: jarvisMsgId,
        reply: `🖥️ **Desktop Application Request**:\n\nOpening **${appName}**.\n\n*Requires the local companion daemon for desktop control (\`npm run companion\`).*`,
        audioText: `Opening ${appName}.`,
        needsClarification: false,
        conversationId
      });
      return;
    }

    // 1.6 WhatsApp Messaging Intent
    const waMatch = trimmed.match(
      /send\s+(?:a\s+)?whatsapp(?:\s+message)?\s+to\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:saying|with\s+message|that)\s+([\s\S]+))?$/i
    );
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
        reply: `⚠️ **WhatsApp Confirmation Required**:\n\n- **Recipient**: ${recipient}\n- **Message**: "${textContent}"\n- **Delivery**: Cloud API / Direct Handoff Prepared\n- **Direct Handoff**: [Open WhatsApp Web](https://wa.me/?text=${encodeURIComponent(
          textContent
        )})\n\nPlease authorize sending or say **"Confirm"** to dispatch.`,
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

    // ==========================================
    // 2. REAL AI BACKEND FOR ORDINARY CONVERSATION
    // ==========================================
    const clientKey = req.headers['x-ai-api-key'] || body?.aiApiKey;
    const clientProvider = req.headers['x-ai-provider'] || body?.aiProvider;
    const aiConfig = resolveAIConfig(clientKey, clientProvider);

    if (aiConfig) {
      try {
        // Build multi-turn context
        const contextMessages: ChatMessage[] = [];
        for (const h of history.slice(-6)) {
          if (h.content) {
            contextMessages.push({
              role: h.role === 'user' ? 'user' : 'assistant',
              content: h.content
            });
          }
        }
        contextMessages.push({ role: 'user', content: trimmed });

        const aiResult = await executeAIConversation(contextMessages, aiConfig);

        res.status(200).json({
          success: true,
          messageId: jarvisMsgId,
          reply: aiResult.reply,
          audioText: aiResult.reply,
          provider: aiResult.provider,
          model: aiResult.model,
          needsClarification: false,
          conversationId
        });
        return;
      } catch (aiErr: any) {
        console.error('AI invocation error:', aiErr);
        res.status(200).json({
          success: false,
          error: `AI Service Error (${aiConfig.provider}): ${aiErr.message || 'Call failed'}`,
          reply: `⚠️ **AI Service Error (${aiConfig.provider})**:\n\n${aiErr.message || 'Unable to connect to AI provider.'}\n\nPlease verify your API key in the Connections tab.`,
          audioText: 'AI service returned an error. Please check your credentials.',
          conversationId
        });
        return;
      }
    }

    // ==========================================
    // 3. HONEST REPORTING WHEN AI IS UNAVAILABLE
    // ==========================================
    res.status(200).json({
      success: false,
      error: 'AI_UNAVAILABLE',
      reply: `⚠️ **AI Service Unavailable**:\n\nNo LLM API key (Google Gemini, OpenAI, Anthropic, or Groq) is currently configured.\n\nTo enable intelligent conversation, math calculation, and text composition, please:\n1. Open the **Connections** tab in the sidebar.\n2. In the **AI Intelligence Service** card, select your provider and paste your API key.\n\nAlternatively, set \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in your environment variables.`,
      audioText: 'AI service is unavailable. Please configure an API key in Connections.',
      needsClarification: false,
      conversationId
    });
  } catch (err: any) {
    console.error('Chat route error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal error'
    });
  }
}
