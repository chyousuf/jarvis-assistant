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

export const api = {
  // Chat
  async sendMessage(message: string, conversationId = 'default') {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId })
    });
    return res.json();
  },

  async getHistory(conversationId = 'default'): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/chat/history?conversationId=${conversationId}`);
    const data = await res.json();
    return data.messages || [];
  },

  async clearHistory(conversationId = 'default') {
    const res = await fetch(`${API_BASE}/chat/history?conversationId=${conversationId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Tasks
  async getTasks(status?: string): Promise<Task[]> {
    const url = status && status !== 'all' ? `${API_BASE}/tasks?status=${status}` : `${API_BASE}/tasks`;
    const res = await fetch(url);
    const data = await res.json();
    return data.tasks || [];
  },

  async cancelTask(id: string) {
    const res = await fetch(`${API_BASE}/tasks/${id}/cancel`, { method: 'POST' });
    return res.json();
  },

  // Approvals
  async getPendingApprovals(): Promise<Approval[]> {
    const res = await fetch(`${API_BASE}/tasks/approvals/pending`);
    const data = await res.json();
    return data.approvals || [];
  },

  async resolveApproval(id: string, decision: 'approved' | 'rejected') {
    const res = await fetch(`${API_BASE}/tasks/approvals/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });
    return res.json();
  },

  // Contacts
  async getContacts(): Promise<Contact[]> {
    const res = await fetch(`${API_BASE}/contacts`);
    const data = await res.json();
    return data.contacts || [];
  },

  async addContact(name: string, email?: string, phone?: string, company?: string) {
    const res = await fetch(`${API_BASE}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, company })
    });
    return res.json();
  },

  // Emails
  async getEmails(status?: string): Promise<EmailRecord[]> {
    const url = status ? `${API_BASE}/emails?status=${status}` : `${API_BASE}/emails`;
    const res = await fetch(url);
    const data = await res.json();
    return data.emails || [];
  },

  async createDraft(to: string, subject: string, body: string, attachments: string[] = []) {
    const res = await fetch(`${API_BASE}/emails/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, attachments })
    });
    return res.json();
  },

  async sendEmail(draftId: string) {
    const res = await fetch(`${API_BASE}/emails/${draftId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return res.json();
  },

  // WhatsApp
  async getWhatsAppMessages(status?: string): Promise<WhatsAppRecord[]> {
    const url = status ? `${API_BASE}/whatsapp?status=${status}` : `${API_BASE}/whatsapp`;
    const res = await fetch(url);
    const data = await res.json();
    return data.messages || [];
  },

  async prepareWhatsApp(recipient: string, message: string, templateName?: string) {
    const res = await fetch(`${API_BASE}/whatsapp/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, message, templateName })
    });
    return res.json();
  },

  async sendWhatsApp(messageId: string) {
    const res = await fetch(`${API_BASE}/whatsapp/${messageId}/send`, {
      method: 'POST'
    });
    return res.json();
  },

  // Calendar
  async getCalendarEvents(): Promise<CalendarRecord[]> {
    const res = await fetch(`${API_BASE}/calendar`);
    const data = await res.json();
    return data.events || [];
  },

  async checkAvailability(date: string) {
    const res = await fetch(`${API_BASE}/calendar/availability?date=${encodeURIComponent(date)}`);
    return res.json();
  },

  async createCalendarEvent(title: string, startTime: string, attendees?: string[], description?: string) {
    const res = await fetch(`${API_BASE}/calendar/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, startTime, attendees, description })
    });
    return res.json();
  },

  // Memory
  async getMemories(): Promise<Memory[]> {
    const res = await fetch(`${API_BASE}/memory`);
    const data = await res.json();
    return data.memories || [];
  },

  async saveMemory(key: string, value: string, category = 'preference') {
    const res = await fetch(`${API_BASE}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, category })
    });
    return res.json();
  },

  async deleteMemory(idOrKey: string) {
    const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(idOrKey)}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Workspace Files
  async getWorkspaceFiles(): Promise<WorkspaceFile[]> {
    const res = await fetch(`${API_BASE}/files`);
    const data = await res.json();
    return data.files || [];
  },

  async getFileContent(filePath: string): Promise<string> {
    const res = await fetch(`${API_BASE}/files/content?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    return data.file?.content || '';
  },

  // Reminders
  async getReminders(status?: string): Promise<Reminder[]> {
    const url = status ? `${API_BASE}/reminders?status=${status}` : `${API_BASE}/reminders`;
    const res = await fetch(url);
    const data = await res.json();
    return data.reminders || [];
  },

  async createReminder(title: string, dueAt: string) {
    const res = await fetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, dueAt })
    });
    return res.json();
  },

  async cancelReminder(id: string) {
    const res = await fetch(`${API_BASE}/reminders/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Integrations & Connections
  async getIntegrations(): Promise<Integration[]> {
    const res = await fetch(`${API_BASE}/integrations`);
    const data = await res.json();
    return data.integrations || [];
  },

  async disconnectIntegration(provider: string) {
    const res = await fetch(`${API_BASE}/oauth/disconnect/${provider}`, {
      method: 'POST'
    });
    return res.json();
  },

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    const res = await fetch(`${API_BASE}/activity`);
    const data = await res.json();
    return data.logs || [];
  },

  // Computer Control
  async getComputerStatus(): Promise<ComputerStatus> {
    const res = await fetch(`${API_BASE}/computer/status`);
    return res.json();
  },

  async emergencyStop(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/computer/stop`, { method: 'POST' });
    return res.json();
  },

  async computerOpenApp(appName: string): Promise<any> {
    const res = await fetch(`${API_BASE}/computer/open-app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appName })
    });
    return res.json();
  },

  async computerSearch(query: string, engine = 'google'): Promise<any> {
    const res = await fetch(`${API_BASE}/computer/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, engine })
    });
    return res.json();
  },

  async computerTypeText(text: string, options?: { replace?: boolean; submitWithReturn?: boolean }): Promise<any> {
    const res = await fetch(`${API_BASE}/computer/type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...options })
    });
    return res.json();
  },

  async computerReadActive(): Promise<any> {
    const res = await fetch(`${API_BASE}/computer/read`);
    return res.json();
  },

  async computerFindFile(query: string): Promise<any> {
    const res = await fetch(`${API_BASE}/computer/find-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },

  async computerCaptureScreen(): Promise<any> {
    const res = await fetch(`${API_BASE}/computer/screen`, { method: 'POST' });
    return res.json();
  }
};
