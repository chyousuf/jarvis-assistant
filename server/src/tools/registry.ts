import { searchWeb } from './webSearch.js';
import { createWorkspaceFile, readWorkspaceFile, listWorkspaceFiles, deleteWorkspaceFile, verifyWorkspaceFileExists } from './workspaceFiles.js';
import { createReminder, listReminders, cancelReminder } from './reminders.js';
import { saveMemory, listMemories, deleteMemory } from './memoryTool.js';
import { createEmailDraft, sendEmail, searchAndSummarizeEmails } from './emailService.js';
import { prepareWhatsAppMessage, sendWhatsAppMessage } from './whatsappService.js';
import { checkAvailability, createCalendarEvent } from './calendarService.js';
import { createDocument } from './documentService.js';
import { listContacts, resolveContact } from './contacts.js';
import { computerTools } from './computerTools.js';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  isSensitive: boolean; // Requires human approval before execution
  actionCategory?: 'email' | 'whatsapp' | 'calendar' | 'delete' | 'money' | 'security' | 'publish';
  execute: (args: any, context?: any) => Promise<any>;
  verifyOutcome?: (args: any, result: any) => Promise<{ verified: boolean; evidence?: string }>;
}

export const TOOLS: Record<string, ToolDefinition> = {
  // Computer Control Tools
  computer_open_app: {
    name: 'computer_open_app',
    description: 'Launch or activate an application on the computer (e.g. WhatsApp, Microsoft Word, TextEdit, YouTube, Chrome, Safari, Notes).',
    parameters: {
      type: 'object',
      properties: {
        appName: { type: 'string', description: 'Name of application to activate (e.g. WhatsApp, TextEdit, Word, YouTube).' }
      },
      required: ['appName']
    },
    isSensitive: false,
    execute: async (args) => computerTools.openApp(args.appName),
    verifyOutcome: async (_args, res) => ({
      verified: res?.success,
      evidence: res?.details || `Activated ${res?.appName}`
    })
  },

  computer_open_search: {
    name: 'computer_open_search',
    description: 'Open browser and execute a live search on YouTube or Google (e.g. cooking videos).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords.' },
        engine: { type: 'string', description: 'Search engine', enum: ['youtube', 'google'] }
      },
      required: ['query']
    },
    isSensitive: false,
    execute: async (args) => computerTools.openSearch(args.query, args.engine || 'google'),
    verifyOutcome: async (args, res) => ({
      verified: res?.success,
      evidence: `Opened ${res?.engine || 'browser'} search for "${args.query}"`
    })
  },

  computer_type_text: {
    name: 'computer_type_text',
    description: 'Type text directly into the currently selected text field or active document.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Content to type or insert.' },
        replace: { type: 'boolean', description: 'Whether to replace existing content.' },
        submitWithReturn: { type: 'boolean', description: 'Whether to press Return key after typing.' }
      },
      required: ['text']
    },
    isSensitive: false,
    execute: async (args) => computerTools.typeText(args.text, { replace: args.replace, submitWithReturn: args.submitWithReturn }),
    verifyOutcome: async (_args, res) => ({
      verified: res?.success,
      evidence: `Typed ${res?.charCount} characters into active ${res?.targetApp} window.`
    })
  },

  computer_read_active: {
    name: 'computer_read_active',
    description: 'Read the active document, visible window text, or currently selected content on screen.',
    parameters: { type: 'object', properties: {}, required: [] },
    isSensitive: false,
    execute: async () => computerTools.readActive(),
    verifyOutcome: async (_args, res) => ({
      verified: typeof res?.content === 'string' && res.content.length > 0,
      evidence: `Read ${res?.charCount} characters from ${res?.source}`
    })
  },

  computer_find_and_open_file: {
    name: 'computer_find_and_open_file',
    description: 'Search authorized user folders (Downloads, Documents, Desktop, Workspace) for a file and open it.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'File name keyword (e.g. invoice, report, downloaded document).' }
      },
      required: ['query']
    },
    isSensitive: false,
    execute: async (args) => computerTools.findFile(args.query),
    verifyOutcome: async (_args, res) => ({
      verified: res?.found,
      evidence: res?.found ? `Located and opened: ${res?.filePath}` : 'File was not located in authorized folders.'
    })
  },

  computer_inspect_window: {
    name: 'computer_inspect_window',
    description: 'Inspect frontmost application name and active window title.',
    parameters: { type: 'object', properties: {}, required: [] },
    isSensitive: false,
    execute: async () => computerTools.inspectWindow()
  },

  computer_capture_screen: {
    name: 'computer_capture_screen',
    description: 'Capture screenshot of current screen state for verification.',
    parameters: { type: 'object', properties: {}, required: [] },
    isSensitive: false,
    execute: async () => computerTools.captureScreen(),
    verifyOutcome: async (_args, res) => ({
      verified: res?.success,
      evidence: `Screenshot captured at ${res?.imagePath}`
    })
  },

  computer_stop: {
    name: 'computer_stop',
    description: 'Immediately stop active speech and cancel ongoing actions.',
    parameters: { type: 'object', properties: {}, required: [] },
    isSensitive: false,
    execute: async () => computerTools.stop()
  },
  // Web Research
  web_search: {
    name: 'web_search',
    description: 'Search live web intelligence and research with citations.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords.' },
        maxResults: { type: 'number', description: 'Number of results' }
      },
      required: ['query']
    },
    isSensitive: false,
    execute: async (args) => searchWeb(args.query, args.maxResults),
    verifyOutcome: async (_args, result) => ({
      verified: Array.isArray(result?.results) && result.results.length > 0,
      evidence: `Retrieved ${result?.results?.length || 0} web citations.`
    })
  },

  // Document & Report Generation
  document_create: {
    name: 'document_create',
    description: 'Create a formal letter, report, memo, note, or printable HTML/PDF in the approved workspace.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title' },
        type: { type: 'string', description: 'Document type', enum: ['letter', 'report', 'memo', 'note'] },
        content: { type: 'string', description: 'Detailed document content' },
        targetFilename: { type: 'string', description: 'Optional target filename (e.g. report.md, summary.html)' }
      },
      required: ['title', 'type', 'content']
    },
    isSensitive: false,
    execute: async (args) => createDocument(args.title, args.type, args.content, args.targetFilename),
    verifyOutcome: async (args, result) => {
      const check = verifyWorkspaceFileExists(result?.filename || args.targetFilename);
      return { verified: check.exists && check.size > 0, evidence: `Document ${result?.filename} created with ${check.size} bytes.` };
    }
  },

  // Email Tools
  email_draft: {
    name: 'email_draft',
    description: 'Create an email draft immediately. Resolves recipient from approved contacts if needed.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address or approved contact name.' },
        subject: { type: 'string', description: 'Email subject line.' },
        body: { type: 'string', description: 'Email body text.' },
        attachments: { type: 'string', description: 'Comma-separated relative workspace filenames.' },
        threadId: { type: 'string', description: 'Optional thread ID for replies.' }
      },
      required: ['to', 'subject', 'body']
    },
    isSensitive: false,
    execute: async (args) => {
      const atts = typeof args.attachments === 'string'
        ? args.attachments.split(',').map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(args.attachments) ? args.attachments : [];
      return await createEmailDraft(args.to, args.subject, args.body, atts, args.threadId);
    },
    verifyOutcome: async (_args, result) => ({
      verified: !!result?.draft?.id,
      evidence: `Draft saved with ID ${result?.draft?.id} to: ${result?.draft?.to_address}`
    })
  },

  email_send: {
    name: 'email_send',
    description: 'Dispatch an approved email. SENSITIVE: Requires explicit user approval.',
    parameters: {
      type: 'object',
      properties: {
        draftId: { type: 'string', description: 'ID of the draft to send.' },
        to: { type: 'string', description: 'Recipient email' },
        subject: { type: 'string', description: 'Subject line' }
      },
      required: ['draftId']
    },
    isSensitive: true,
    actionCategory: 'email',
    execute: async (args) => sendEmail(args.draftId),
    verifyOutcome: async (_args, result) => ({
      verified: result?.success && !!result?.messageId,
      evidence: `Provider confirmation ID: ${result?.messageId} (${result?.provider})`
    })
  },

  email_search: {
    name: 'email_search',
    description: 'Search and read inbox emails by keyword or sender.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword.' }
      },
      required: ['query']
    },
    isSensitive: false,
    execute: async (args) => searchAndSummarizeEmails(args.query),
    verifyOutcome: async (_args, result) => ({
      verified: Array.isArray(result?.results),
      evidence: `Found ${result?.results?.length || 0} matching emails.`
    })
  },

  // WhatsApp Tools
  whatsapp_prepare: {
    name: 'whatsapp_prepare',
    description: 'Prepare a WhatsApp message, resolve recipient from contacts, and evaluate Meta API/template requirements.',
    parameters: {
      type: 'object',
      properties: {
        recipient: { type: 'string', description: 'Recipient name from approved contacts or phone number.' },
        message: { type: 'string', description: 'Message content.' },
        templateName: { type: 'string', description: 'Optional Meta-approved template name.' }
      },
      required: ['recipient', 'message']
    },
    isSensitive: false,
    execute: async (args) => prepareWhatsAppMessage(args.recipient, args.message, args.templateName),
    verifyOutcome: async (_args, result) => ({
      verified: !!result?.messageId,
      evidence: `Prepared WhatsApp message for ${result?.recipientName} (${result?.recipientPhone})`
    })
  },

  whatsapp_send: {
    name: 'whatsapp_send',
    description: 'Transmit an approved WhatsApp message. SENSITIVE: Requires user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'ID of the prepared WhatsApp message.' },
        recipientName: { type: 'string', description: 'Recipient name' },
        messageText: { type: 'string', description: 'Message text' }
      },
      required: ['messageId']
    },
    isSensitive: true,
    actionCategory: 'whatsapp',
    execute: async (args) => sendWhatsAppMessage(args.messageId),
    verifyOutcome: async (_args, result) => ({
      verified: result?.success,
      evidence: `Delivery state: ${result?.deliveryStatus}`
    })
  },

  // Calendar Tools
  calendar_check: {
    name: 'calendar_check',
    description: 'Check calendar schedule and find free availability slots.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date string (e.g. tomorrow, 2026-09-24)' }
      },
      required: ['date']
    },
    isSensitive: false,
    execute: async (args) => checkAvailability(args.date),
    verifyOutcome: async (_args, result) => ({
      verified: Array.isArray(result?.freeSlots),
      evidence: `Found ${result?.freeSlots?.length || 0} free appointment windows.`
    })
  },

  calendar_create_event: {
    name: 'calendar_create_event',
    description: 'Schedule a calendar event. If external attendees are included, requires explicit confirmation.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title.' },
        startTime: { type: 'string', description: 'Start time (ISO or natural string).' },
        endTime: { type: 'string', description: 'End time.' },
        attendees: { type: 'string', description: 'Comma-separated attendee email addresses.' },
        description: { type: 'string', description: 'Description or agenda.' }
      },
      required: ['title', 'startTime']
    },
    isSensitive: false, // createCalendarEvent dynamically flags requiresConfirmation if attendees present
    execute: async (args) => {
      const atts = typeof args.attendees === 'string'
        ? args.attendees.split(',').map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(args.attendees) ? args.attendees : [];
      return await createCalendarEvent(args.title, args.startTime, args.endTime, atts, args.description);
    },
    verifyOutcome: async (_args, result) => ({
      verified: !!result?.event?.id,
      evidence: `Event scheduled: ${result?.event?.title} at ${result?.event?.start_time}`
    })
  },

  // Workspace Files
  workspace_file_create: {
    name: 'workspace_file_create',
    description: 'Create or overwrite a file in the approved workspace directory.',
    parameters: {
      type: 'object',
      properties: {
        relativePath: { type: 'string', description: 'Relative path in workspace' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['relativePath', 'content']
    },
    isSensitive: false,
    execute: async (args) => createWorkspaceFile(args.relativePath, args.content),
    verifyOutcome: async (args) => {
      const check = verifyWorkspaceFileExists(args.relativePath);
      return { verified: check.exists && check.size > 0, evidence: `File verified on disk (${check.size} bytes).` };
    }
  },

  workspace_file_read: {
    name: 'workspace_file_read',
    description: 'Read a file inside the approved workspace.',
    parameters: {
      type: 'object',
      properties: {
        relativePath: { type: 'string', description: 'Relative path to read' }
      },
      required: ['relativePath']
    },
    isSensitive: false,
    execute: async (args) => readWorkspaceFile(args.relativePath)
  },

  workspace_file_list: {
    name: 'workspace_file_list',
    description: 'List all files in the approved workspace.',
    parameters: { type: 'object', properties: {}, required: [] },
    isSensitive: false,
    execute: async () => listWorkspaceFiles()
  },

  workspace_file_delete: {
    name: 'workspace_file_delete',
    description: 'Delete a file from workspace. SENSITIVE: Requires approval.',
    parameters: {
      type: 'object',
      properties: {
        relativePath: { type: 'string', description: 'Relative path to delete' }
      },
      required: ['relativePath']
    },
    isSensitive: true,
    actionCategory: 'delete',
    execute: async (args) => deleteWorkspaceFile(args.relativePath)
  },

  // Reminders
  reminder_create: {
    name: 'reminder_create',
    description: 'Schedule a persistent reminder.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Reminder prompt.' },
        dueAt: { type: 'string', description: 'Time string (e.g. in 10 minutes).' }
      },
      required: ['title', 'dueAt']
    },
    isSensitive: false,
    execute: async (args) => createReminder(args.title, args.dueAt),
    verifyOutcome: async (_args, result) => ({
      verified: !!result?.id,
      evidence: `Reminder stored in SQLite for ${result?.due_at}`
    })
  },

  reminder_list: {
    name: 'reminder_list',
    description: 'List active reminders.',
    parameters: { type: 'object', properties: {}, required: [] },
    isSensitive: false,
    execute: async () => listReminders()
  },

  // Memory
  memory_save: {
    name: 'memory_save',
    description: 'Store a user preference or fact.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Memory key' },
        value: { type: 'string', description: 'Memory value' },
        category: { type: 'string', description: 'Category' }
      },
      required: ['key', 'value']
    },
    isSensitive: false,
    execute: async (args) => saveMemory(args.key, args.value, args.category)
  },

  memory_list: {
    name: 'memory_list',
    description: 'List user memories.',
    parameters: { type: 'object', properties: {}, required: [] },
    isSensitive: false,
    execute: async () => listMemories()
  }
};
