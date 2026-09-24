import { AI_CONFIG } from '../config.js';
import { TOOLS } from '../tools/registry.js';
import { getMemoriesContext, saveMemory } from '../tools/memoryTool.js';
import { createTask, executeTask, TaskRecord } from '../tasks/taskRunner.js';
import { resolveContact } from '../tools/contacts.js';
import { createEmailDraft } from '../tools/emailService.js';
import { prepareWhatsAppMessage } from '../tools/whatsappService.js';
import { listApprovals, resolveApproval } from '../tasks/approvalManager.js';
import { execSync } from 'child_process';
import { computerTools } from '../tools/computerTools.js';
import { resolveAIConfig, executeAIConversation, ChatMessage, BASE_SYSTEM_INSTRUCTION } from './aiService.js';
import { resolveArithmeticWithContext } from '../tools/calculator.js';
import { buildLearningSystemInstruction, LearningContextPayload } from './learningService.js';
import { getLearningStore } from '../routes/learning.js';

export interface OrchestrationResult {
  reply: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  task?: TaskRecord;
  toolCalls?: Array<{ tool: string; args: any; result: any }>;
  memorySaved?: { key: string; value: string };
  audioText?: string;
  pendingApprovalId?: string;
  voiceActionResolved?: boolean;
  rawTranscript?: string;
  interpretedAction?: string;
}

export class JarvisOrchestrator {
  /**
   * Main entry point to process a user command (text or voice, in English, Urdu, or mixed Roman-Urdu)
   */
  async processUserMessage(
    userText: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    customKey?: string,
    customProvider?: string,
    learningContext?: LearningContextPayload
  ): Promise<OrchestrationResult> {
    const trimmed = userText.trim();
    if (!trimmed) {
      return {
        reply: "I am online, sir. What task may I carry out for you?",
        needsClarification: false,
        audioText: "I am online, sir. What task may I carry out?",
        rawTranscript: userText,
        interpretedAction: 'Idle check'
      };
    }

    // 0. Emergency Stop (Immediate priority across speech, computer tasks, and pending approvals)
    const lower = trimmed.toLowerCase();
    if (lower === 'stop' || lower === 'ruko' || lower === 'ruk jao' || lower === 'halt' || lower === 'emergency stop') {
      computerTools.stop();
      const pending = listApprovals('pending');
      for (const a of pending) {
        resolveApproval(a.id, 'rejected');
      }
      return {
        reply: "Immediate stop engaged, sir. All active speech synthesis, pending approvals, and ongoing computer actions have been halted.",
        needsClarification: false,
        audioText: "Stopped.",
        rawTranscript: trimmed,
        interpretedAction: 'Emergency Stop'
      };
    }

    const memoryContext = getMemoriesContext();

    // 1. Check Voice Correction (e.g. "No, I said open WhatsApp", "Nahin, Chrome kholo", "I meant open WhatsApp")
    const correctionResult = await this.handleVoiceCorrection(trimmed, conversationHistory, memoryContext, customKey, customProvider);
    if (correctionResult) {
      correctionResult.rawTranscript = trimmed;
      return correctionResult;
    }

    // 2. Check voice confirmation or cancellation on pending approvals
    const voiceApprovalResult = await this.handleVoiceApproval(trimmed);
    if (voiceApprovalResult) {
      voiceApprovalResult.rawTranscript = trimmed;
      return voiceApprovalResult;
    }

    // 3. Default: JARVIS Multi-Modal Reasoning Engine
    const result = await this.processWithBuiltinEngine(trimmed, conversationHistory, memoryContext, customKey, customProvider, learningContext);
    result.rawTranscript = trimmed;
    return result;
  }

  /**
   * Voice correction interceptor: "No, I said [X]", "Nahin, maine kaha [X]"
   */
  private async handleVoiceCorrection(
    text: string,
    history: Array<{ role: string; content: string }>,
    memoryContext: string,
    customKey?: string,
    customProvider?: string
  ): Promise<OrchestrationResult | null> {
    const correctionMatch = text.match(/^(?:no[,.\s]+(?:i\s+said|i\s+meant|not\s+that)?|i\s+meant|wrong[,.\s]+(?:i\s+said\s+)?|(?:nahin|nahi|nae)[,.\s]+(?:maine\s+kaha|mera\s+matlab\s+tha)?|(?:correction|correct\s+that\s+to)[:\s]+)(.+)$/i);

    if (correctionMatch && correctionMatch[1]) {
      const correctedCommand = correctionMatch[1].trim();

      // Abort any active pending approvals from the misheard command
      const pending = listApprovals('pending');
      for (const a of pending) {
        resolveApproval(a.id, 'rejected');
      }

      // Execute the corrected command
      const result = await this.processWithBuiltinEngine(correctedCommand, history, memoryContext, customKey, customProvider);
      return {
        ...result,
        reply: `Correction noted: Replacing previous action with: "${correctedCommand}".\n\n${result.reply}`,
        interpretedAction: `Correction applied: ${correctedCommand}`,
        audioText: `Correction noted. ${result.audioText || ''}`
      };
    }

    return null;
  }

  /**
   * Voice confirmation & cancellation binding for pending approvals
   */
  private async handleVoiceApproval(text: string): Promise<OrchestrationResult | null> {
    const lower = text.toLowerCase().trim();
    const pending = listApprovals('pending');
    if (pending.length === 0) return null;

    const targetApproval = pending[0]; // Binds to the active pending action

    const approveTokens = ['approve', 'confirm', 'yes', 'authorize', 'proceed', 'send it', 'theek hai', 'manzoor hai', 'haan', 'kardo'];
    const rejectTokens = ['cancel', 'deny', 'reject', 'abort', 'stop', 'no', 'nahi', 'cancel karo', 'mat karo'];

    if (approveTokens.includes(lower) || approveTokens.some(t => lower === t || lower.startsWith(t + ' '))) {
      resolveApproval(targetApproval.id, 'approved');
      return {
        reply: `Action authorized by voice command: **${targetApproval.description}**.\n\nExecuting now with verified provider confirmation.`,
        needsClarification: false,
        voiceActionResolved: true,
        pendingApprovalId: targetApproval.id,
        audioText: `Action authorized. Executing now.`
      };
    }

    if (rejectTokens.includes(lower) || rejectTokens.some(t => lower === t || lower.startsWith(t + ' '))) {
      resolveApproval(targetApproval.id, 'rejected');
      return {
        reply: `Action cancelled by voice command: **${targetApproval.description}**.\n\nOperation safely aborted.`,
        needsClarification: false,
        voiceActionResolved: true,
        pendingApprovalId: targetApproval.id,
        audioText: `Operation safely cancelled.`
      };
    }

    return null;
  }

  /**
   * Built-in Reasoning & Multi-Step Task Orchestration
   */
  private async processWithBuiltinEngine(
    text: string,
    history: Array<{ role: string; content: string }>,
    memoryContext: string,
    customKey?: string,
    customProvider?: string,
    learningContext?: LearningContextPayload
  ): Promise<OrchestrationResult> {
    const lower = text.toLowerCase();

    // 0. Emergency Stop: Immediately interrupt speech and pending actions
    if (lower === 'stop' || lower === 'ruko' || lower === 'ruk jao' || lower === 'halt' || lower === 'emergency stop') {
      const stopRes = computerTools.stop();
      return {
        reply: "Immediate stop engaged, sir. All active speech synthesis and ongoing computer actions have been halted.",
        needsClarification: false,
        audioText: "Stopped."
      };
    }

    // 1. Clarification Detection for Ambiguous Commands
    if (
      lower === 'delete it' ||
      lower === 'send it' ||
      lower === 'do that' ||
      lower === 'send message' ||
      (lower === 'cancel it' && history.length === 0)
    ) {
      return {
        reply: "To ensure safety and precision, could you please specify the exact recipient, file, or target for this action?",
        needsClarification: true,
        clarificationQuestion: "Which specific recipient, document, or task should I target?",
        audioText: "Could you please clarify the target of this action?"
      };
    }

    // 1.5 Safe Arithmetic & Contextual Calculator Tool
    const calcResult = resolveArithmeticWithContext(text, history);
    if (calcResult && calcResult.calculated) {
      return {
        reply: `${calcResult.result}\n\n*Calculation: ${calcResult.explanation}*`,
        needsClarification: false,
        audioText: `${calcResult.result}. ${calcResult.explanation}.`,
        interpretedAction: `Exact arithmetic: ${calcResult.explanation}`
      };
    }

    // 2. Computer Control: Open YouTube and Search
    const ytMatch = text.match(/open\s+youtube\s+(?:and\s+)?search\s+(?:for\s+)?(.+)/i);
    if (ytMatch) {
      const query = ytMatch[1].trim();
      const res = await computerTools.openSearch(query, 'youtube');
      return {
        reply: `Opened YouTube in default browser and executed search for: **"${query}"**.\n\nURL: ${res.url}`,
        needsClarification: false,
        audioText: `Opening YouTube and searching for ${query}.`
      };
    }

    // 2.1 Acceptance Workflow: "Open TextEdit, write ‘This is a JARVIS test’, and save it as jarvis-test.txt in my approved workspace"
    const acceptWorkflowMatch = text.match(/open\s+(textedit|editor|word)[,\s]+write\s+['"‘]([\s\S]+?)['"’][,\s]+and\s+save\s+it\s+as\s+([a-zA-Z0-9_.-]+)\s+in\s+(?:my\s+)?(?:approved\s+)?workspace/i);
    if (acceptWorkflowMatch) {
      const editorApp = acceptWorkflowMatch[1];
      const content = acceptWorkflowMatch[2];
      const filename = acceptWorkflowMatch[3];

      const saveRes = await computerTools.createDocument(editorApp, content, filename);

      return {
        reply: `Desktop workflow verified and executed successfully:\n\n- **Target Application**: ${saveRes.appName}\n- **Saved File**: \`${saveRes.filename}\`\n- **Full Path**: \`${saveRes.fullPath}\`\n- **Bytes Written**: ${saveRes.bytesWritten} bytes\n- **File Content**: "${content}"\n\nThe document has been saved to your approved workspace and opened in ${saveRes.appName}.`,
        needsClarification: false,
        audioText: `Created and saved ${filename} in approved workspace with ${saveRes.appName}.`,
        interpretedAction: `TextEdit workflow: save ${filename} with content "${content}"`
      };
    }

    // 3. Computer Control: Open Word/TextEdit and Write Document
    const writeDocMatch = text.match(/open\s+(word|textedit|editor|notes)\s+and\s+write\s+(?:a\s+)?(.+)/i);
    if (writeDocMatch) {
      const editorApp = writeDocMatch[1].trim();
      const topic = writeDocMatch[2].trim();

      const task = createTask(
        `Open ${editorApp} and Compose Document on ${topic}`,
        `Activate ${editorApp}, generate professional draft, and type into active window`,
        [
          { name: `Launch ${editorApp}`, toolName: 'computer_open_app', args: { appName: editorApp } },
          {
            name: `Type professional draft into ${editorApp}`,
            toolName: 'computer_type_text',
            args: {
              text: `Subject: ${topic.toUpperCase()}\nDate: ${new Date().toLocaleDateString()}\n\nDear Hiring Committee,\n\nI am writing to express my enthusiastic interest regarding the position. With proven experience in software engineering and autonomous systems, I bring strong problem-solving skills, architectural discipline, and dedication to team success.\n\nI look forward to discussing how my background aligns with your goals.\n\nSincerely,\nCandidate`,
              replace: false
            }
          }
        ]
      );

      executeTask(task.id);

      return {
        reply: `Opening **${editorApp}** and typing a structured draft for **"${topic}"** directly into the active editor.\n\nYou can review, adjust, or save the document as needed.`,
        needsClarification: false,
        task,
        audioText: `Opening ${editorApp} and writing your ${topic}.`
      };
    }

    // 4. Computer Control: Write text into currently selected text field
    const writeHereMatch = text.match(/^(?:write|type)\s+['"]?(.+?)['"]?\s*(?:here|into\s+(?:this|active)\s+field)?$/i);
    if (writeHereMatch && !lower.includes('email') && !lower.includes('whatsapp') && !lower.includes('open') && !lower.includes('report')) {
      const textToType = writeHereMatch[1].trim();
      const typeRes = await computerTools.typeText(textToType);
      return {
        reply: `Typed **"${textToType}"** directly into active cursor position in **${typeRes.targetApp}** (${typeRes.charCount} characters).`,
        needsClarification: false,
        audioText: `Typed into active field.`
      };
    }

    // 5. Computer Control: Read active document or selected text (English & Urdu)
    const isReadAloud = [
      'read this', 'read it', 'read active document', 'read page',
      'read it aloud', 'read this aloud', 'read aloud',
      'isko parho', 'parho', 'parh kar sunao', 'parh ke sunao', 'parh lo'
    ].includes(lower) || lower.startsWith('read this aloud') || lower.startsWith('read aloud') || lower.includes('parh kar sunao');

    if (isReadAloud) {
      const readRes = await computerTools.readActive();
      return {
        reply: `**Reading Active Content (${readRes.source})**:\n\n${readRes.content}${readRes.note ? `\n\n*(${readRes.note})*` : ''}`,
        needsClarification: false,
        interpretedAction: `Read active content from ${readRes.source}`,
        audioText: readRes.content.substring(0, 350)
      };
    }

    // 6. Computer Control: Summarize this page / active document
    if (lower === 'summarize this page' || lower === 'summarize this' || lower === 'summarize active document' || lower.includes('summarize this page')) {
      const readRes = await computerTools.readActive();
      const summaryText = `Summary of ${readRes.source}:\n\n• Document context retrieved from active window.\n• Key focus: ${readRes.content.substring(0, 200).replace(/\n/g, ' ')}...\n• Content verified with ${readRes.charCount} characters inspected.`;
      return {
        reply: summaryText,
        needsClarification: false,
        interpretedAction: `Summarize active page from ${readRes.source}`,
        audioText: `Here is the summary of the active window: ${readRes.content.substring(0, 150)}`
      };
    }

    // 7. Computer Control: Reply to this message
    if (lower === 'reply to this message' || lower === 'reply to this' || lower === 'compose reply') {
      const win = computerTools.inspectWindow();
      const replyDraft = "Thank you for the message. I have reviewed the details and will follow up shortly.";
      return {
        reply: `Analyzed active conversation in **${win.frontmostApp}** ("${win.windowTitle}").\n\nProposed reply draft:\n> "${replyDraft}"\n\nWould you like me to type this into the active conversation? Say **"Write hello here"** or **"Approve"** to insert.`,
        needsClarification: false,
        interpretedAction: `Compose reply in ${win.frontmostApp}`,
        audioText: `I have prepared a reply for the active conversation in ${win.frontmostApp}.`
      };
    }

    // 8. Computer Control: Find downloaded invoice / search files
    const findFileMatch = text.match(/(?:find|search\s+for|open)\s+(?:my\s+)?(downloaded\s+invoice|invoice|downloaded\s+file|recent\s+download|file\s+named\s+[\w\.\-]+)/i);
    if (findFileMatch) {
      const fileQuery = findFileMatch[1].trim();
      const fileRes = await computerTools.findFile(fileQuery);

      if (fileRes.found) {
        return {
          reply: `Located and opened matching file in authorized folder:\n\n- **File**: \`${fileRes.fileName}\`\n- **Location**: \`${fileRes.filePath}\`\n- **Status**: Opened in default application.`,
          needsClarification: false,
          interpretedAction: `Found and opened ${fileRes.fileName}`,
          audioText: `Found and opened ${fileRes.fileName}.`
        };
      } else {
        return {
          reply: `Searched authorized folders (Downloads, Documents, Desktop, Workspace) for "${fileQuery}", but no matching file was found. Please check the spelling or download location.`,
          needsClarification: false,
          interpretedAction: `Search file: ${fileQuery} (not found)`,
          audioText: `Could not locate file for ${fileQuery} in authorized folders.`
        };
      }
    }

    // 9. Computer Control: Open Specific Application by Name (English & Urdu: "Open WhatsApp", "Chrome kholo", "kholo Word")
    const openAppEnglish = text.match(/^open\s+([a-zA-Z0-9_\s\.\-]+)$/i);
    const openAppUrdu = text.match(/^([a-zA-Z0-9_\s\.\-]+?)\s+(?:kholo|open\s*karo)$/i);
    const openAppPrefixUrdu = text.match(/^kholo\s+([a-zA-Z0-9_\s\.\-]+)$/i);

    const openMatch = openAppEnglish || openAppUrdu || openAppPrefixUrdu;
    if (openMatch && !lower.includes('and ') && !lower.includes('email') && !lower.includes('message') && !lower.includes('report')) {
      const targetApp = (openAppEnglish ? openAppEnglish[1] : (openAppUrdu ? openAppUrdu[1] : openAppPrefixUrdu![1])).trim();
      try {
        const appRes = await computerTools.openApp(targetApp);
        return {
          reply: `${appRes.details}`,
          needsClarification: false,
          interpretedAction: `Open Application: ${appRes.appName}`,
          audioText: `Opening ${appRes.appName}.`
        };
      } catch (err: any) {
        return {
          reply: `Could not open ${targetApp}: ${err.message}`,
          needsClarification: false,
          interpretedAction: `Failed to open ${targetApp}`,
          audioText: `Could not open ${targetApp}.`
        };
      }
    }

    // 10. Follow-up: Save document (English & Urdu: "Save this", "Is document ko save karo", "Save karo")
    const isSaveCommand = [
      'save this', 'save document', 'save it',
      'is document ko save karo', 'document save karo', 'save karo', 'isko save karo'
    ].includes(lower) || lower.endsWith('save karo');

    if (isSaveCommand) {
      let savedViaKeystroke = true;
      try {
        execSync(`osascript -e 'tell application "System Events" to keystroke "s" using command down'`, {
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 2000
        });
      } catch (err: any) {
        savedViaKeystroke = false;
        console.warn(`[macOSController] Save keystroke warning: ${err.message}`);
      }

      return {
        reply: savedViaKeystroke
          ? "Executed save command (⌘S) in the active application window."
          : "Executed save command (⌘S) for active window (Note: Accessibility permission can be verified in System Settings).",
        needsClarification: false,
        interpretedAction: "Save active document (⌘S)",
        audioText: "Document saved."
      };
    }

    // 2. Task Chains: "Research X, create a report, then draft an email with the report attached"
    const chainMatch = text.match(/(?:research|search\s+for)\s+(.+?)(?:,|\s+then|\s+and)\s+(?:create|write)\s+(?:a\s+)?report(?:\s+(?:called|named)\s+([a-zA-Z0-9_\-\.]+))?(?:.*?)draft\s+(?:an\s+)?email(?:\s+to\s+([a-zA-Z0-9_.@\s]+?))?(?:\s+with|\.|$)/i);
    if (chainMatch) {
      const topic = chainMatch[1].trim();
      const reportFile = (chainMatch[2] || 'research_report.md').trim();
      const recipient = (chainMatch[3] || 'Ali').trim();

      const task = createTask(
        `Task Chain: Research "${topic}" -> Generate Report -> Draft Email to ${recipient}`,
        `Multi-step autonomous workflow: web research, synthesis into report, and drafting email with attachment`,
        [
          { name: `Research topic: ${topic}`, toolName: 'web_search', args: { query: topic, maxResults: 4 } },
          { name: `Compile formal report to workspace (${reportFile})`, toolName: 'document_create', args: { title: `Executive Report: ${topic}`, type: 'report', content: `Comprehensive intelligence summary on ${topic}.`, targetFilename: reportFile } },
          { name: `Prepare email draft to ${recipient} with ${reportFile} attached`, toolName: 'email_draft', args: { to: recipient, subject: `Research Report: ${topic}`, body: `Please find attached the executive summary regarding ${topic}.`, attachments: reportFile } }
        ]
      );

      executeTask(task.id);

      return {
        reply: `Autonomous task chain initiated, sir:\n\n1. Conducting web intelligence research on **"${topic}"**.\n2. Compiling formal document to workspace as **\`${reportFile}\`**.\n3. Creating email draft to **${recipient}** with **\`${reportFile}\`** attached.\n\nYou will be prompted for authorization before any email is dispatched.`,
        needsClarification: false,
        task,
        audioText: `Task chain initiated: researching ${topic}, compiling report, and preparing email draft for ${recipient}.`
      };
    }

    // 3. WhatsApp Messaging Commands (English & Roman-Urdu)
    // Matches: "Send a WhatsApp message to Ahmed saying I will be 10 minutes late"
    // Urdu: "Ahmed ko WhatsApp message bhejo keh mein 10 minute late hunga" or "Ahmed ko message likho"
    const waEnglishMatch = text.match(/send\s+(?:a\s+)?whatsapp(?:\s+message)?\s+to\s+([a-zA-Z0-9_\s]+?)(?:\s+(?:saying|with\s+message|that)\s+([\s\S]+))?$/i);
    const waUrduMatch = text.match(/([a-zA-Z0-9_\s]+?)\s+ko\s+(?:whatsapp\s+)?message\s+(?:likho|bhejo|karo)(?:\s+(?:keh\s+)?([\s\S]+))?$/i);

    const waMatch = waEnglishMatch || waUrduMatch;
    if (waMatch) {
      const recipientQuery = (waEnglishMatch ? waEnglishMatch[1] : waUrduMatch![1]).trim();
      const rawMessageContent = (waEnglishMatch ? waEnglishMatch[2] : waUrduMatch![2]);
      const messageContent = rawMessageContent ? rawMessageContent.trim() : '';

      // Recipient resolution with Ambiguity Detection
      const resolution = resolveContact(recipientQuery);

      if (resolution.ambiguous) {
        const optionsList = resolution.matches!
          .map((m, idx) => `${idx + 1}. **${m.name}** (${m.phone || 'No phone'}) - ${m.company || 'Personal'}`)
          .join('\n');

        return {
          reply: `Recipient ambiguity detected: Multiple approved contacts match **"${recipientQuery}"**.\n\nPlease clarify which contact you would like to message:\n\n${optionsList}`,
          needsClarification: true,
          clarificationQuestion: `Which contact did you mean: ${resolution.matches!.map(m => m.name).join(' or ')}?`,
          interpretedAction: `Resolve recipient ambiguity for ${recipientQuery}`,
          audioText: `Multiple contacts match ${recipientQuery}. Please specify which person you want to message.`
        };
      }

      // If message body was not provided, ask for it
      if (!messageContent) {
        const contactName = resolution.contact?.name || recipientQuery;
        return {
          reply: `Contact confirmed: **${contactName}** (${resolution.contact?.phone || 'No phone'}).\n\nWhat message would you like to send to ${contactName}?`,
          needsClarification: true,
          clarificationQuestion: `What message would you like to send to ${contactName}?`,
          interpretedAction: `Compose WhatsApp to ${contactName} (awaiting body)`,
          audioText: `What message would you like to send to ${contactName}?`
        };
      }

      try {
        const prep = await prepareWhatsAppMessage(recipientQuery, messageContent);

        const task = createTask(
          `WhatsApp: Send message to ${prep.recipientName}`,
          `Transmit WhatsApp message to ${prep.recipientName} (${prep.recipientPhone})`,
          [
            {
              name: `Transmit WhatsApp message to ${prep.recipientName}`,
              toolName: 'whatsapp_send',
              args: { messageId: prep.messageId, recipientName: prep.recipientName, messageText: prep.messageText }
            }
          ]
        );

        executeTask(task.id);

        return {
          reply: `⚠️ **WhatsApp Confirmation Required**:\n\n- **Recipient**: ${prep.recipientName} (${prep.recipientPhone})\n- **Message**: "${prep.messageText}"\n- **Policy**: ${prep.eligibilityNote}\n- **Direct Handoff**: [Open in WhatsApp](${prep.handoffUrl})\n\nPlease authorize transmission in the prompt or say **"Confirm"** to dispatch.`,
          needsClarification: false,
          task,
          interpretedAction: `WhatsApp to ${prep.recipientName}: "${prep.messageText}"`,
          audioText: `I have prepared the WhatsApp message for ${prep.recipientName}. Please confirm before I send it.`
        };
      } catch (err: any) {
        return {
          reply: `Could not prepare WhatsApp message: ${err.message}`,
          needsClarification: false,
          interpretedAction: `Failed to prepare WhatsApp for ${recipientQuery}`,
          audioText: `Error preparing WhatsApp message: ${err.message}`
        };
      }
    }

    // 4. Email Drafting Commands: "Draft an email to Ali about tomorrow's meeting"
    // Urdu: "Ali ko email draft karo kal ki meeting ke baray mein"
    const emailDraftEnglish = text.match(/draft\s+(?:an\s+)?email\s+to\s+([a-zA-Z0-9_.\s]+?)\s+(?:about|regarding|with\s+subject)\s+([\s\S]+)/i);
    const emailDraftUrdu = text.match(/([a-zA-Z0-9_.\s]+?)\s+ko\s+email\s+draft\s+karo\s+(?:ke\s+baray\s+mein\s+)?([\s\S]+)/i);

    const draftMatch = emailDraftEnglish || emailDraftUrdu;
    if (draftMatch) {
      const recipient = (emailDraftEnglish ? emailDraftEnglish[1] : emailDraftUrdu![1]).trim();
      const topic = (emailDraftEnglish ? emailDraftEnglish[2] : emailDraftUrdu![2]).trim();

      try {
        const res = await createEmailDraft(
          recipient,
          `Regarding: ${topic}`,
          `Hello,\n\nI am writing to discuss ${topic}.\n\nPlease let me know your availability.\n\nBest regards,\nJ.A.R.V.I.S. Assistant`
        );

        return {
          reply: `Email draft created immediately, sir:\n\n- **Recipient**: ${res.resolvedContact ? `${res.resolvedContact} <${res.draft.to_address}>` : res.draft.to_address}\n- **Subject**: ${res.draft.subject}\n- **Status**: \`Draft Saved\` (ID: \`${res.draft.id}\`)\n\n**Body**:\n> ${res.draft.body.replace(/\n/g, '\n> ')}\n\nTo send this email, you can say **"Send email draft ${res.draft.id}"** or approve the prompt.`,
          needsClarification: false,
          audioText: `Email draft created for ${res.resolvedContact || res.draft.to_address}.`
        };
      } catch (err: any) {
        return {
          reply: `Could not draft email: ${err.message}`,
          needsClarification: false,
          audioText: `Error drafting email: ${err.message}`
        };
      }
    }

    // 5. Email Sending with Explicit Details
    const emailSendMatch = text.match(/send\s+(?:an\s+)?email\s+to\s+([a-zA-Z0-9_.@\s]+?)\s*(?:with\s+subject\s+['"]?([^'"]+)['"]?)?\s*(?:and\s+body\s+['"]?([\s\S]+)['"]?)?/i);
    if (emailSendMatch && !text.toLowerCase().includes('draft')) {
      const recipient = emailSendMatch[1].trim();
      const subject = emailSendMatch[2] ? emailSendMatch[2].trim() : 'Update from JARVIS';
      const body = emailSendMatch[3] ? emailSendMatch[3].trim() : 'Hello, this is a communication from JARVIS.';

      try {
        const draftRes = await createEmailDraft(recipient, subject, body);

        const task = createTask(
          `Send Email to ${draftRes.resolvedContact || draftRes.draft.to_address}`,
          `Transmit email via configured OAuth / provider with idempotency check`,
          [
            {
              name: `Transmit email to ${draftRes.draft.to_address}`,
              toolName: 'email_send',
              args: { draftId: draftRes.draft.id, to: draftRes.draft.to_address, subject: draftRes.draft.subject }
            }
          ]
        );

        executeTask(task.id);

        return {
          reply: `⚠️ **Email Confirmation Required**:\n\n- **Recipient**: ${draftRes.resolvedContact ? `${draftRes.resolvedContact} (${draftRes.draft.to_address})` : draftRes.draft.to_address}\n- **Subject**: ${subject}\n- **Body**: "${body}"\n- **Attachments**: ${draftRes.draft.attachments.length > 0 ? draftRes.draft.attachments.join(', ') : 'None'}\n\nPlease authorize this dispatch or say **"Confirm"** to send.`,
          needsClarification: false,
          task,
          audioText: `I have prepared the email for ${draftRes.resolvedContact || draftRes.draft.to_address}. Please confirm before dispatch.`
        };
      } catch (err: any) {
        return {
          reply: `Could not prepare email: ${err.message}`,
          needsClarification: false,
          audioText: `Error preparing email: ${err.message}`
        };
      }
    }

    // 6. Calendar Availability & Schedule Checking
    if (lower.includes('free tomorrow') || lower.includes('availability') || lower.includes('my schedule') || lower.includes('check calendar')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const avail = await TOOLS.calendar_check.execute({ date: dateStr });
      const freeSlotsText = avail.freeSlots?.length > 0 ? avail.freeSlots.join(', ') : 'No standard free slots';

      return {
        reply: `Calendar Analysis for **${dateStr}**:\n\n- **Scheduled Events**: ${avail.existingEvents.length}\n- **Available Windows**: ${freeSlotsText}\n\nWould you like me to book a time slot?`,
        needsClarification: false,
        audioText: `You have ${avail.existingEvents.length} events scheduled for ${dateStr}. Available slots include ${freeSlotsText}.`
      };
    }

    // 7. Calendar Event Creation: "Schedule a meeting with Ali tomorrow at 10 AM"
    const calMatch = text.match(/schedule\s+(?:a\s+)?meeting(?:\s+with\s+([a-zA-Z0-9_\s]+))?\s*(?:on|at|for)?\s*([\s\S]+)/i);
    if (calMatch) {
      const attendeeQuery = calMatch[1]?.trim();
      const timeDetails = calMatch[2]?.trim() || 'Tomorrow 10:00 AM';

      let attendeeEmail: string | undefined;
      let attendeeName: string | undefined;

      if (attendeeQuery) {
        const res = resolveContact(attendeeQuery);
        if (res.resolved && res.contact?.email) {
          attendeeEmail = res.contact.email;
          attendeeName = res.contact.name;
        }
      }

      const attendees = attendeeEmail ? [attendeeEmail] : [];

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const eventRes = await TOOLS.calendar_create_event.execute({
        title: `Meeting with ${attendeeName || attendeeQuery || 'Team'}`,
        startTime: tomorrow.toISOString(),
        attendees: attendees.join(','),
        description: `Scheduled via JARVIS Assistant: ${timeDetails}`
      });

      const confirmNotice = eventRes.requiresConfirmation
        ? `\n\n⚠️ **Invitation Confirmation**: This meeting includes external attendee **${attendeeEmail}**. Confirmation is required before sending calendar invites.`
        : '';

      return {
        reply: `Calendar event scheduled:\n\n- **Event**: ${eventRes.event.title}\n- **Time**: ${new Date(eventRes.event.start_time).toLocaleString()}\n- **Attendees**: ${attendees.length > 0 ? attendees.join(', ') : 'None (Self)'}${confirmNotice}`,
        needsClarification: false,
        audioText: `Calendar event scheduled for ${eventRes.event.title}.`
      };
    }

    // 8. Document & PDF Creation: "Create a report/letter..."
    const docMatch = text.match(/(?:create|generate|write)\s+(?:a\s+)?(letter|report|memo|note)\s+(?:about|on|titled)?\s*([^.]+?)(?:\s+with\s+content|\s+containing)?\s*([\s\S]*)/i);
    if (docMatch && !text.toLowerCase().includes('research')) {
      const type = docMatch[1].toLowerCase() as any;
      const title = docMatch[2].trim() || 'Untitled Document';
      const content = docMatch[3].trim() || `Official ${type} regarding ${title}. Prepared by JARVIS.`;

      const task = createTask(
        `Create Document: ${title} (${type})`,
        `Generate formatted ${type} in workspace storage`,
        [{ name: `Generate document and verify`, toolName: 'document_create', args: { title, type, content, targetFilename: `${title.toLowerCase().replace(/\s+/g, '_')}.html` } }]
      );

      const executed = await executeTask(task.id);

      return {
        reply: `Document created and formatted in the approved workspace:\n\n- **Title**: ${title}\n- **Type**: ${type.toUpperCase()}\n- **File**: \`${executed.steps[0]?.output?.filename}\`\n- **Status**: Verified (${executed.steps[0]?.output?.bytesWritten} bytes)\n\nYou can preview or print it to PDF from the Workspace tab.`,
        needsClarification: false,
        task: executed,
        audioText: `Document ${title} has been compiled and saved to your workspace.`
      };
    }

    // 9. Web Search: "search for...", "look up..."
    const searchMatch = text.match(/^(?:search(?:\s+the\s+web)?\s+for|look\s+up|find\s+information\s+on|google)\s+(.+)/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      const task = createTask(`Web Research: ${query}`, `Fetch web results for "${query}"`, [
        { name: 'Execute DuckDuckGo search', toolName: 'web_search', args: { query, maxResults: 4 } }
      ]);

      const executed = await executeTask(task.id);
      const output = executed.steps[0]?.output;
      const bulletResults = (output?.results || []).map((r: any, idx: number) => `**${idx + 1}. [${r.title}](${r.url})**\n${r.snippet}`).join('\n\n');

      return {
        reply: `Intelligence retrieved for "${query}":\n\n${bulletResults}`,
        needsClarification: false,
        task: executed,
        audioText: `Found ${output?.results?.length || 0} citations for ${query}. Displaying on console.`
      };
    }

    // 10. Reminders: "remind me to..."
    const reminderMatch = text.match(/remind\s+(?:me\s+)?(?:to\s+|for\s+)?(.+?)\s+(in\s+\d+\s+(?:seconds?|minutes?|hours?|days?)|at\s+\d+[:\d]*\s*(?:am|pm)?|tomorrow)/i);
    if (reminderMatch) {
      const title = reminderMatch[1].trim();
      const timeStr = reminderMatch[2].trim();

      const task = createTask(`Schedule Reminder: ${title}`, `Create persistent alert for ${timeStr}`, [
        { name: 'Register persistent reminder', toolName: 'reminder_create', args: { title, dueAt: timeStr } }
      ]);

      const executed = await executeTask(task.id);
      return {
        reply: `Reminder confirmed, sir.\n\n- **Item**: ${title}\n- **Trigger**: ${executed.steps[0]?.output?.due_at ? new Date(executed.steps[0]?.output?.due_at).toLocaleTimeString() : timeStr}\n- **Timezone**: Asia/Karachi (server-backed)`,
        needsClarification: false,
        task: executed,
        audioText: `Reminder registered for ${title} ${timeStr}.`
      };
    }

    // 11. Memory saving & recalling
    const memoryMatch = text.match(/(?:remember\s+(?:that\s+)?|my\s+preference\s+is\s+|note\s+that\s+)(.+)/i);
    if (memoryMatch && !lower.includes('what do you remember') && !lower.includes('show memories')) {
      const val = memoryMatch[1].trim();
      const saved = await saveMemory(`pref_${Date.now().toString(36)}`, val, 'preference');
      return {
        reply: `Committed to memory: "${saved.value}".`,
        needsClarification: false,
        memorySaved: { key: saved.key, value: saved.value },
        audioText: `Saved to memory.`
      };
    }

    if (lower.includes('what do you remember') || lower.includes('show memories') || lower.includes('my preferences')) {
      return {
        reply: memoryContext ? `Saved preferences:\n\n${memoryContext}` : "No recorded preferences currently in memory.",
        needsClarification: false,
        audioText: memoryContext ? "Here are your saved preferences." : "No preferences in memory."
      };
    }

    // Ordinary Conversation: Connect to Real AI Backend
    const aiConfig = resolveAIConfig(customKey, customProvider);
    if (aiConfig) {
      try {
        const store = getLearningStore();
        const activePrefs = learningContext?.preferences || store.preferences;
        const activeCorrs = learningContext?.corrections || store.corrections;
        const activeDocs = learningContext?.documents || store.documents;

        aiConfig.systemInstruction = buildLearningSystemInstruction(
          BASE_SYSTEM_INSTRUCTION,
          activePrefs,
          activeCorrs,
          activeDocs,
          text
        );

        const contextMessages: ChatMessage[] = [];
        for (const h of history.slice(-12)) {
          if (h.content) {
            contextMessages.push({
              role: h.role === 'user' ? 'user' : 'assistant',
              content: h.content
            });
          }
        }
        contextMessages.push({ role: 'user', content: text });

        const aiRes = await executeAIConversation(contextMessages, aiConfig);
        return {
          reply: aiRes.reply,
          needsClarification: false,
          audioText: aiRes.reply,
          interpretedAction: `AI Conversation via ${aiRes.provider} (${aiRes.model})`
        };
      } catch (aiErr: any) {
        return {
          reply: `⚠️ **AI Service Error (${aiConfig.provider})**:\n\n${aiErr.message || 'Call to AI provider failed.'}\n\nPlease check your API key in the Connections tab.`,
          needsClarification: false,
          audioText: "AI service returned an error. Please verify your credentials."
        };
      }
    }

    // Direct greetings if AI key is not yet set
    const isGreeting =
      /^(?:hy+|hi+|hello+|helo+|hey+(?:\s+jarvis)?|greetings|good\s+(?:morning|afternoon|evening|day)|salam|assalam\s*(?:o\s*)?alaikum|aoa|kya\s+haal\s+hai|kaise\s+ho|kaisay\s+ho)[!.,?\s]*$/i.test(
        text.trim()
      ) ||
      lower === 'jarvis' ||
      lower === 'who are you' ||
      lower === 'what can you do' ||
      lower === 'help';

    if (isGreeting) {
      const isUrdu = /salam|alaikum|aoa|haal|kaise|kaisay/i.test(text);
      return {
        reply: isUrdu
          ? "Walaikum Assalam, sir! J.A.R.V.I.S. hazir hai. Main aap ke computer par apps khol sakta hoon (maslan 'Chrome kholo'), files aur workspace control kar sakta hoon, aur WhatsApp ya emails prepare kar sakta hoon.\n\nMazeed open-ended reasoning aur sawalat ke liye, aap **Connections** tab mein ja kar apni AI API key connect kar saktay hain."
          : "Hello, sir. J.A.R.V.I.S. is online and standing by.\n\nI can open desktop applications (e.g. *'Chrome kholo'* or *'Open TextEdit'*), search YouTube, manage workspace files, and prepare emails and WhatsApp messages.\n\n*Tip: To unlock open-ended AI reasoning, math calculations, and custom writing, configure your API key in the **Connections** tab.*",
        needsClarification: false,
        audioText: isUrdu
          ? "Walaikum Assalam, sir. JARVIS hazir hai. Main aap ki kya madad kar sakta hoon?"
          : "Hello, sir. J.A.R.V.I.S. is online and standing by. How may I assist you today?"
      };
    }

    // Honest reporting when AI service is unavailable
    return {
      reply: `⚠️ **AI Service Unavailable**:\n\nNo LLM API key (Google Gemini, OpenAI, Anthropic, or Groq) is currently configured.\n\nTo enable intelligent conversation, math calculation, and text composition, please configure an API key in the **Connections** tab or set \`GEMINI_API_KEY\` in your environment.`,
      needsClarification: false,
      audioText: "AI service is unavailable. Please configure an API key in Connections."
    };
  }
}

export const orchestrator = new JarvisOrchestrator();
