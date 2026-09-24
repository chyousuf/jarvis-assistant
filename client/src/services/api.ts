export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'jarvis' | 'system';
  content: string;
  tool_calls?: any;
  created_at: string;
}

export interface TaskStep {
  id: string;
  name: string;
  toolName?: string;
  args?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'needs_approval';
  approvalId?: string;
  output?: any;
  error?: string;
  evidence?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  steps: TaskStep[];
  result?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  task_id: string;
  action_type: string;
  description: string;
  payload: any;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Memory {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'personal' | 'project' | 'fact';
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  due_at: string;
  status: 'pending' | 'fired' | 'cancelled';
  timezone: string;
  created_at: string;
}

export interface WorkspaceFile {
  name: string;
  relativePath: string;
  size: number;
  updatedAt: string;
  isDirectory: boolean;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'demo' | 'unavailable';
  config: any;
  permissions?: string[];
  capabilities: string[];
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface EmailRecord {
  id: string;
  thread_id?: string;
  to_address: string;
  subject: string;
  body: string;
  attachments: string[];
  status: 'draft' | 'pending_approval' | 'sending' | 'sent' | 'failed';
  provider: string;
  provider_message_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppRecord {
  id: string;
  contact_id?: string;
  recipient_phone: string;
  recipient_name: string;
  message_text: string;
  template_name?: string;
  status: 'pending_approval' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'handoff_prepared';
  provider_message_id?: string;
  handoff_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarRecord {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  attendees: string[];
  timezone: string;
  status: 'confirmed' | 'pending_confirmation' | 'cancelled';
  created_at: string;
}

export interface ActivityLog {
  id: string;
  category: string;
  action: string;
  details: string | null;
  timestamp: string;
}

export interface ActiveWindowInfo {
  frontmostApp: string;
  windowTitle: string;
  isBrowser: boolean;
  isEditor: boolean;
  isCommunication: boolean;
}

export interface ComputerStatus {
  success: boolean;
  companionConnected: boolean;
  isLocalCompanion?: boolean;
  os: {
    platform: string;
    isMacOS: boolean;
    osRelease: string;
    hasAccessibility: boolean;
    hasAutomation: boolean;
    hasScreenCapture: boolean;
    hasSpeechSynthesis: boolean;
  };
  activeWindow: ActiveWindowInfo;
  authorizedFolders: string[];
}

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
export const COMPANION_URL = 'http://127.0.0.1:4001';

export function getCompanionToken(): string {
  return localStorage.getItem('jarvis_companion_token') || '';
}

export function setCompanionToken(token: string) {
  if (token) {
    localStorage.setItem('jarvis_companion_token', token.trim());
  } else {
    localStorage.removeItem('jarvis_companion_token');
  }
}

export function getAIKey(): string {
  return localStorage.getItem('jarvis_ai_key') || '';
}

export function setAIKey(key: string) {
  if (key) {
    localStorage.setItem('jarvis_ai_key', key.trim());
  } else {
    localStorage.removeItem('jarvis_ai_key');
  }
}

export function getAIProvider(): string {
  return localStorage.getItem('jarvis_ai_provider') || 'gemini';
}

export function setAIProvider(provider: string) {
  localStorage.setItem('jarvis_ai_provider', provider);
}

export function getAccessPasscode(): string {
  return localStorage.getItem('jarvis_access_passcode') || '';
}

export function setAccessPasscode(passcode: string) {
  if (passcode) {
    localStorage.setItem('jarvis_access_passcode', passcode.trim());
  } else {
    localStorage.removeItem('jarvis_access_passcode');
  }
}

/**
 * Resilient JSON fetch helper that inspects status, validates Content-Type,
 * and guards against HTML/empty responses that cause "Unexpected end of JSON input".
 */
export async function fetchJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Inject AI Key and Provider if available
  const aiKey = getAIKey();
  if (aiKey && !headers.has('x-ai-api-key')) {
    headers.set('x-ai-api-key', aiKey);
  }
  const aiProvider = getAIProvider();
  if (aiProvider && !headers.has('x-ai-provider')) {
    headers.set('x-ai-provider', aiProvider);
  }

  // Inject Access Passcode if configured
  const passcode = getAccessPasscode();
  if (passcode && !headers.has('x-jarvis-passcode')) {
    headers.set('x-jarvis-passcode', passcode);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    throw new Error(`Network connection error: ${netErr.message || 'Server unreachable'}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(`Server returned error ${res.status}: ${res.statusText}`);
    }
    // Received HTML or non-JSON
    throw new Error(`API returned unexpected response format (${res.status} ${res.statusText}).`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr: any) {
    throw new Error(`Failed to parse JSON response: ${parseErr.message}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data as T;
}

export const api = {
  // AI Status & Real Diagnostics
  async getAIStatus(): Promise<{
    success: boolean;
    configured: boolean;
    source: string;
    provider: string;
    model: string;
    maskedKey: string | null;
    environment: string;
    passcodeRequired: boolean;
  }> {
    return fetchJson(`${API_BASE}/ai`);
  },

  async testAIConnection(prompt = 'What is 17 multiplied by 6?'): Promise<{
    success: boolean;
    latencyMs: number;
    provider: string;
    model: string;
    prompt?: string;
    reply?: string;
    errorCode?: string;
    errorMessage?: string;
    testedAt: string;
  }> {
    return fetchJson(`${API_BASE}/ai`, {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
  },

  // Chat
  async sendMessage(message: string, conversationId = 'default') {
    return fetchJson(`${API_BASE}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, conversationId })
    });
  },

  async getHistory(conversationId = 'default'): Promise<Message[]> {
    try {
      const data = await fetchJson<{ success: boolean; messages: Message[] }>(
        `${API_BASE}/chat/history?conversationId=${conversationId}`
      );
      return data.messages || [];
    } catch {
      return [];
    }
  },

  async clearHistory(conversationId = 'default') {
    return fetchJson(`${API_BASE}/chat/history?conversationId=${conversationId}`, {
      method: 'DELETE'
    });
  },

  // Tasks
  async getTasks(status?: string): Promise<Task[]> {
    try {
      const url = status && status !== 'all' ? `${API_BASE}/tasks?status=${status}` : `${API_BASE}/tasks`;
      const data = await fetchJson<{ success: boolean; tasks: Task[] }>(url);
      return data.tasks || [];
    } catch {
      return [];
    }
  },

  async cancelTask(id: string) {
    return fetchJson(`${API_BASE}/tasks/${id}/cancel`, { method: 'POST' });
  },

  // Approvals
  async getPendingApprovals(): Promise<Approval[]> {
    try {
      const data = await fetchJson<{ success: boolean; approvals: Approval[] }>(`${API_BASE}/tasks/approvals/pending`);
      return data.approvals || [];
    } catch {
      return [];
    }
  },

  async resolveApproval(id: string, decision: 'approved' | 'rejected') {
    return fetchJson(`${API_BASE}/tasks/approvals/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decision })
    });
  },

  // Contacts
  async getContacts(): Promise<Contact[]> {
    try {
      const data = await fetchJson<{ success: boolean; contacts: Contact[] }>(`${API_BASE}/contacts`);
      return data.contacts || [];
    } catch {
      return [];
    }
  },

  async addContact(name: string, email?: string, phone?: string, company?: string) {
    return fetchJson(`${API_BASE}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, company })
    });
  },

  // Emails
  async getEmails(status?: string): Promise<EmailRecord[]> {
    try {
      const url = status ? `${API_BASE}/emails?status=${status}` : `${API_BASE}/emails`;
      const data = await fetchJson<{ success: boolean; emails: EmailRecord[] }>(url);
      return data.emails || [];
    } catch {
      return [];
    }
  },

  async createDraft(to: string, subject: string, body: string, attachments: string[] = []) {
    return fetchJson(`${API_BASE}/emails/draft`, {
      method: 'POST',
      body: JSON.stringify({ to, subject, body, attachments })
    });
  },

  async sendEmail(draftId: string) {
    return fetchJson(`${API_BASE}/emails/${draftId}/send`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  // WhatsApp
  async getWhatsAppMessages(status?: string): Promise<WhatsAppRecord[]> {
    try {
      const url = status ? `${API_BASE}/whatsapp?status=${status}` : `${API_BASE}/whatsapp`;
      const data = await fetchJson<{ success: boolean; messages: WhatsAppRecord[] }>(url);
      return data.messages || [];
    } catch {
      return [];
    }
  },

  async prepareWhatsApp(recipient: string, message: string, templateName?: string) {
    return fetchJson(`${API_BASE}/whatsapp/prepare`, {
      method: 'POST',
      body: JSON.stringify({ recipient, message, templateName })
    });
  },

  async sendWhatsApp(messageId: string) {
    return fetchJson(`${API_BASE}/whatsapp/${messageId}/send`, {
      method: 'POST'
    });
  },

  // Calendar
  async getCalendarEvents(): Promise<CalendarRecord[]> {
    try {
      const data = await fetchJson<{ success: boolean; events: CalendarRecord[] }>(`${API_BASE}/calendar`);
      return data.events || [];
    } catch {
      return [];
    }
  },

  async checkAvailability(date: string) {
    return fetchJson(`${API_BASE}/calendar/availability?date=${encodeURIComponent(date)}`);
  },

  async createCalendarEvent(title: string, startTime: string, attendees?: string[], description?: string) {
    return fetchJson(`${API_BASE}/calendar/events`, {
      method: 'POST',
      body: JSON.stringify({ title, startTime, attendees, description })
    });
  },

  // Memory
  async getMemories(): Promise<Memory[]> {
    try {
      const data = await fetchJson<{ success: boolean; memories: Memory[] }>(`${API_BASE}/memory`);
      return data.memories || [];
    } catch {
      return [];
    }
  },

  async saveMemory(key: string, value: string, category = 'preference') {
    return fetchJson(`${API_BASE}/memory`, {
      method: 'POST',
      body: JSON.stringify({ key, value, category })
    });
  },

  async deleteMemory(idOrKey: string) {
    return fetchJson(`${API_BASE}/memory/${encodeURIComponent(idOrKey)}`, {
      method: 'DELETE'
    });
  },

  // Workspace Files
  async getWorkspaceFiles(): Promise<WorkspaceFile[]> {
    try {
      const data = await fetchJson<{ success: boolean; files: WorkspaceFile[] }>(`${API_BASE}/files`);
      return data.files || [];
    } catch {
      return [];
    }
  },

  async getFileContent(filePath: string): Promise<string> {
    try {
      const data = await fetchJson<{ success: boolean; file?: { content: string } }>(
        `${API_BASE}/files/content?path=${encodeURIComponent(filePath)}`
      );
      return data.file?.content || '';
    } catch {
      return '';
    }
  },

  // Reminders
  async getReminders(status?: string): Promise<Reminder[]> {
    try {
      const url = status ? `${API_BASE}/reminders?status=${status}` : `${API_BASE}/reminders`;
      const data = await fetchJson<{ success: boolean; reminders: Reminder[] }>(url);
      return data.reminders || [];
    } catch {
      return [];
    }
  },

  async createReminder(title: string, dueAt: string) {
    return fetchJson(`${API_BASE}/reminders`, {
      method: 'POST',
      body: JSON.stringify({ title, dueAt })
    });
  },

  async cancelReminder(id: string) {
    return fetchJson(`${API_BASE}/reminders/${id}`, { method: 'DELETE' });
  },

  // Integrations & Connections
  async getIntegrations(): Promise<Integration[]> {
    try {
      const data = await fetchJson<{ success: boolean; integrations: Integration[] }>(`${API_BASE}/integrations`);
      return data.integrations || [];
    } catch {
      return [];
    }
  },

  async disconnectIntegration(provider: string) {
    return fetchJson(`${API_BASE}/oauth/disconnect/${provider}`, {
      method: 'POST'
    });
  },

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    try {
      const data = await fetchJson<{ success: boolean; logs: ActivityLog[] }>(`${API_BASE}/activity`);
      return data.logs || [];
    } catch {
      return [];
    }
  },

  // Computer Control with Truthful Local Companion Probing
  async getComputerStatus(): Promise<ComputerStatus> {
    const token = getCompanionToken();
    const companionHeaders: Record<string, string> = {};
    if (token) {
      companionHeaders['Authorization'] = `Bearer ${token}`;
    }

    // 1. Try local companion daemon first (fast probe with 1.2s timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`${COMPANION_URL}/api/computer/status`, {
        signal: controller.signal,
        headers: companionHeaders
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          companionConnected: true,
          isLocalCompanion: true
        };
      }
    } catch {
      // Local companion not responding
    }

    // 2. Query server/cloud status
    try {
      const serverData = await fetchJson<ComputerStatus>(`${API_BASE}/computer/status`);
      return {
        ...serverData,
        companionConnected: false,
        isLocalCompanion: false
      };
    } catch {
      // Return truthful disconnected state
      return {
        success: true,
        companionConnected: false,
        isLocalCompanion: false,
        os: {
          platform: 'darwin',
          isMacOS: true,
          osRelease: 'Offline',
          hasAccessibility: false,
          hasAutomation: false,
          hasScreenCapture: false,
          hasSpeechSynthesis: false
        },
        activeWindow: {
          frontmostApp: 'Companion Disconnected',
          windowTitle: 'Run `npm run companion` on Mac to pair',
          isBrowser: false,
          isEditor: false,
          isCommunication: false
        },
        authorizedFolders: []
      };
    }
  },

  async emergencyStop(): Promise<{ success: boolean; message: string }> {
    // Try companion first
    try {
      return await fetchJson(`${COMPANION_URL}/api/computer/stop`, { method: 'POST' });
    } catch {
      return fetchJson(`${API_BASE}/computer/stop`, { method: 'POST' });
    }
  },

  async computerOpenApp(appName: string): Promise<any> {
    try {
      return await fetchJson(`${COMPANION_URL}/api/computer/open-app`, {
        method: 'POST',
        body: JSON.stringify({ appName })
      });
    } catch {
      return fetchJson(`${API_BASE}/computer/open-app`, {
        method: 'POST',
        body: JSON.stringify({ appName })
      });
    }
  },

  async computerSearch(query: string, engine = 'google'): Promise<any> {
    try {
      return await fetchJson(`${COMPANION_URL}/api/computer/search`, {
        method: 'POST',
        body: JSON.stringify({ query, engine })
      });
    } catch {
      return fetchJson(`${API_BASE}/computer/search`, {
        method: 'POST',
        body: JSON.stringify({ query, engine })
      });
    }
  },

  async computerTypeText(text: string, options?: { replace?: boolean; submitWithReturn?: boolean }): Promise<any> {
    try {
      return await fetchJson(`${COMPANION_URL}/api/computer/type`, {
        method: 'POST',
        body: JSON.stringify({ text, ...options })
      });
    } catch {
      return fetchJson(`${API_BASE}/computer/type`, {
        method: 'POST',
        body: JSON.stringify({ text, ...options })
      });
    }
  },

  async computerReadActive(): Promise<any> {
    try {
      return await fetchJson(`${COMPANION_URL}/api/computer/read`);
    } catch {
      return fetchJson(`${API_BASE}/computer/read`);
    }
  },

  async computerFindFile(query: string): Promise<any> {
    try {
      return await fetchJson(`${COMPANION_URL}/api/computer/find-file`, {
        method: 'POST',
        body: JSON.stringify({ query })
      });
    } catch {
      return fetchJson(`${API_BASE}/computer/find-file`, {
        method: 'POST',
        body: JSON.stringify({ query })
      });
    }
  },

  async computerCaptureScreen(): Promise<any> {
    try {
      return await fetchJson(`${COMPANION_URL}/api/computer/screen`, { method: 'POST' });
    } catch {
      return fetchJson(`${API_BASE}/computer/screen`, { method: 'POST' });
    }
  }
};
