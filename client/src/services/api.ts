export interface Citation {
  id: string;
  docTitle: string;
  sectionIndex: number;
  snippet: string;
  fullContent: string;
}

export interface AppliedCorrection {
  id: string;
  originalRequest: string;
  approvedCorrection: string;
  scope: 'once' | 'conversation' | 'reusable';
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'jarvis' | 'system';
  content: string;
  tool_calls?: any;
  appliedCorrection?: AppliedCorrection;
  citations?: Citation[];
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

// Proactively purge legacy client key from localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('jarvis_ai_key');
  }
} catch {
  // ignore
}

export function getSessionToken(): string {
  try {
    return localStorage.getItem('jarvis_session_token') || '';
  } catch {
    return '';
  }
}

export function setSessionToken(token: string) {
  try {
    if (token) {
      localStorage.setItem('jarvis_session_token', token.trim());
    } else {
      localStorage.removeItem('jarvis_session_token');
    }
  } catch {
    // ignore
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

export interface UserPreference {
  id: string;
  category: 'language' | 'style' | 'timezone' | 'output_format' | 'general';
  key: string;
  value: string;
  enabled: boolean;
  origin: 'User Added' | 'Default' | 'Inferred';
  updated_at: string;
}

export interface UserCorrection {
  id: string;
  originalRequest: string;
  incorrectInterpretation: string;
  approvedCorrection: string;
  scope: 'once' | 'conversation' | 'reusable';
  conversationId?: string;
  tags?: string[];
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docTitle: string;
  sectionIndex: number;
  content: string;
  charCount: number;
}

export interface DocumentKnowledge {
  id: string;
  title: string;
  content: string;
  fileType?: 'txt' | 'md' | 'json' | 'csv' | 'pdf' | 'docx';
  fileSize?: number;
  tags: string[];
  chunks?: DocumentChunk[];
  created_at: string;
  updated_at: string;
}

export interface RoutineStep {
  id: string;
  name: string;
  action: string;
  toolName?: string;
  args?: Record<string, any>;
  requiresApproval?: boolean;
}

export interface ReusableRoutine {
  id: string;
  name: string;
  description: string;
  inputs: Record<string, { label: string; type: 'string' | 'number' | 'boolean'; defaultValue: any }>;
  steps: RoutineStep[];
  requiredConnections: string[];
  requiredPermissions: string[];
  schedule?: {
    enabled: boolean;
    time?: string;
    timezone: string;
  };
  lastRun?: {
    timestamp: string;
    status: 'success' | 'failed';
    summary?: string;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CLIENT_PREFERENCES: UserPreference[] = [
  {
    id: 'pref-lang-1',
    category: 'language',
    key: 'Language Support',
    value: 'English, Urdu, and Pakistani Roman-Urdu seamlessly',
    enabled: true,
    origin: 'Default',
    updated_at: new Date().toISOString()
  },
  {
    id: 'pref-tz-1',
    category: 'timezone',
    key: 'Timezone',
    value: 'Asia/Karachi (PKT, UTC+5)',
    enabled: true,
    origin: 'Default',
    updated_at: new Date().toISOString()
  },
  {
    id: 'pref-style-1',
    category: 'style',
    key: 'Tone & Persona',
    value: 'Courteous, precise, and respectful, addressing the user as Sir',
    enabled: true,
    origin: 'Default',
    updated_at: new Date().toISOString()
  },
  {
    id: 'pref-output-1',
    category: 'output_format',
    key: 'Calculations & Format',
    value: 'Exact numeric values with mathematical precision; concise spoken summaries',
    enabled: true,
    origin: 'Default',
    updated_at: new Date().toISOString()
  }
];

export function getStoredPreferences(): UserPreference[] {
  try {
    const raw = localStorage.getItem('jarvis_learning_preferences');
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return DEFAULT_CLIENT_PREFERENCES;
}

export function saveStoredPreferences(prefs: UserPreference[]) {
  localStorage.setItem('jarvis_learning_preferences', JSON.stringify(prefs));
}

export function getStoredCorrections(): UserCorrection[] {
  try {
    const raw = localStorage.getItem('jarvis_learning_corrections');
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return [];
}

export function saveStoredCorrections(corrs: UserCorrection[]) {
  localStorage.setItem('jarvis_learning_corrections', JSON.stringify(corrs));
}

export function getStoredDocuments(): DocumentKnowledge[] {
  try {
    const raw = localStorage.getItem('jarvis_learning_documents');
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return [
    {
      id: 'doc-welcome',
      title: 'JARVIS System Architecture & Directives',
      content: 'J.A.R.V.I.S. (Just A Rather Very Intelligent System) is engineered for autonomous desktop automation, context-aware reasoning, and personal productivity. Built with privacy-first principles and bounded tool execution.',
      tags: ['system', 'architecture', 'directives'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}

export function saveStoredDocuments(docs: DocumentKnowledge[]) {
  localStorage.setItem('jarvis_learning_documents', JSON.stringify(docs));
}

export const DEFAULT_CLIENT_ROUTINES: ReusableRoutine[] = [
  {
    id: 'routine-daily-briefing',
    name: 'Prepare My Daily Briefing',
    description: 'Summarizes today’s authorized calendar agenda, active priority tasks, and top market/tech briefing in a structured morning overview.',
    inputs: {
      includeWeather: { label: 'Include Local Weather (Karachi)', type: 'boolean', defaultValue: true },
      taskLimit: { label: 'Max Tasks to Review', type: 'number', defaultValue: 5 }
    },
    steps: [
      { id: 'step-cal', name: 'Fetch Today’s Calendar Schedule', action: 'calendar_list_events', requiresApproval: false },
      { id: 'step-tasks', name: 'Review Pending Priority Tasks', action: 'tasks_list_pending', requiresApproval: false },
      { id: 'step-synth', name: 'Synthesize Structured Briefing', action: 'ai_synthesize_briefing', requiresApproval: false }
    ],
    requiredConnections: ['calendar', 'tasks'],
    requiredPermissions: ['read_calendar', 'read_tasks'],
    schedule: {
      enabled: false,
      time: '09:00',
      timezone: 'Asia/Karachi'
    },
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export function getStoredRoutines(): ReusableRoutine[] {
  try {
    const raw = localStorage.getItem('jarvis_learning_routines');
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return DEFAULT_CLIENT_ROUTINES;
}

export function saveStoredRoutines(routines: ReusableRoutine[]) {
  localStorage.setItem('jarvis_learning_routines', JSON.stringify(routines));
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

  // Inject Provider if available
  const aiProvider = getAIProvider();
  if (aiProvider && !headers.has('x-ai-provider')) {
    headers.set('x-ai-provider', aiProvider);
  }

  // Inject Signed Session Token if available
  const sessionToken = getSessionToken();
  if (sessionToken && !headers.has('x-jarvis-token')) {
    headers.set('x-jarvis-token', sessionToken);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${sessionToken}`);
    }
  }

  // Inject Access Passcode if configured
  const passcode = getAccessPasscode();
  if (passcode && !headers.has('x-jarvis-passcode')) {
    headers.set('x-jarvis-passcode', passcode);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, credentials: 'include' });
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
    throw new Error(data?.message || data?.error || `HTTP ${res.status}: ${res.statusText}`);
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
  async sendMessage(
    message: string,
    conversationId = 'default',
    history: Array<{ role: string; content: string }> = [],
    learningContext?: {
      preferences?: UserPreference[];
      corrections?: UserCorrection[];
      documents?: DocumentKnowledge[];
    }
  ) {
    const effectiveLearning = learningContext || {
      preferences: getStoredPreferences(),
      corrections: getStoredCorrections(),
      documents: getStoredDocuments()
    };

    return fetchJson(`${API_BASE}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversationId,
        history,
        learningContext: effectiveLearning
      })
    });
  },

  // Learning & Memory Center
  async getPreferences(): Promise<UserPreference[]> {
    try {
      const data = await fetchJson<{ success: boolean; preferences: UserPreference[] }>(`${API_BASE}/learning?tab=preferences`);
      if (data.preferences) {
        saveStoredPreferences(data.preferences);
        return data.preferences;
      }
    } catch { /* fallback to local */ }
    return getStoredPreferences();
  },

  async savePreference(pref: Omit<UserPreference, 'id' | 'updated_at'>): Promise<UserPreference> {
    const newItem: UserPreference = {
      ...pref,
      id: `pref-${Date.now().toString(36)}`,
      updated_at: new Date().toISOString()
    };
    try {
      await fetchJson(`${API_BASE}/learning`, {
        method: 'POST',
        body: JSON.stringify({ type: 'preference', data: newItem })
      });
    } catch { /* local sync */ }
    const current = getStoredPreferences();
    const updated = [...current, newItem];
    saveStoredPreferences(updated);
    return newItem;
  },

  async updatePreference(id: string, updates: Partial<UserPreference>): Promise<void> {
    try {
      await fetchJson(`${API_BASE}/learning`, {
        method: 'PUT',
        body: JSON.stringify({ type: 'preference', id, data: updates })
      });
    } catch { /* local sync */ }
    const current = getStoredPreferences();
    const updated = current.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p);
    saveStoredPreferences(updated);
  },

  async deletePreference(id: string): Promise<void> {
    try {
      await fetchJson(`${API_BASE}/learning?tab=preferences&id=${id}`, { method: 'DELETE' });
    } catch { /* local sync */ }
    const current = getStoredPreferences();
    saveStoredPreferences(current.filter(p => p.id !== id));
  },

  async getCorrections(): Promise<UserCorrection[]> {
    try {
      const data = await fetchJson<{ success: boolean; corrections: UserCorrection[] }>(`${API_BASE}/learning?tab=corrections`);
      if (data.corrections) {
        saveStoredCorrections(data.corrections);
        return data.corrections;
      }
    } catch { /* fallback to local */ }
    return getStoredCorrections();
  },

  async addCorrection(corr: Omit<UserCorrection, 'id' | 'created_at'>): Promise<UserCorrection> {
    const newItem: UserCorrection = {
      ...corr,
      id: `corr-${Date.now().toString(36)}`,
      created_at: new Date().toISOString()
    };
    try {
      await fetchJson(`${API_BASE}/learning`, {
        method: 'POST',
        body: JSON.stringify({ type: 'correction', data: newItem })
      });
    } catch { /* local sync */ }
    const current = getStoredCorrections();
    const updated = [...current, newItem];
    saveStoredCorrections(updated);
    return newItem;
  },

  async deleteCorrection(id: string): Promise<void> {
    try {
      await fetchJson(`${API_BASE}/learning?tab=corrections&id=${id}`, { method: 'DELETE' });
    } catch { /* local sync */ }
    const current = getStoredCorrections();
    saveStoredCorrections(current.filter(c => c.id !== id));
  },

  async getDocuments(): Promise<DocumentKnowledge[]> {
    try {
      const data = await fetchJson<{ success: boolean; documents: DocumentKnowledge[] }>(`${API_BASE}/learning?tab=documents`);
      if (data.documents) {
        saveStoredDocuments(data.documents);
        return data.documents;
      }
    } catch { /* fallback to local */ }
    return getStoredDocuments();
  },

  async saveDocument(doc: Omit<DocumentKnowledge, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentKnowledge> {
    const newItem: DocumentKnowledge = {
      ...doc,
      id: `doc-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      await fetchJson(`${API_BASE}/learning`, {
        method: 'POST',
        body: JSON.stringify({ type: 'document', data: newItem })
      });
    } catch { /* local sync */ }
    const current = getStoredDocuments();
    const updated = [...current, newItem];
    saveStoredDocuments(updated);
    return newItem;
  },

  async deleteDocument(id: string): Promise<void> {
    try {
      await fetchJson(`${API_BASE}/learning?tab=documents&id=${id}`, { method: 'DELETE' });
    } catch { /* local sync */ }
    const current = getStoredDocuments();
    saveStoredDocuments(current.filter(d => d.id !== id));
  },

  async getRoutines(): Promise<ReusableRoutine[]> {
    try {
      const data = await fetchJson<{ success: boolean; routines: ReusableRoutine[] }>(`${API_BASE}/learning?tab=routines`);
      if (data.routines) {
        saveStoredRoutines(data.routines);
        return data.routines;
      }
    } catch { /* fallback */ }
    return getStoredRoutines();
  },

  async saveRoutine(routine: Omit<ReusableRoutine, 'id' | 'created_at' | 'updated_at'>): Promise<ReusableRoutine> {
    const newItem: ReusableRoutine = {
      ...routine,
      id: `routine-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      await fetchJson(`${API_BASE}/learning`, {
        method: 'POST',
        body: JSON.stringify({ type: 'routine', data: newItem })
      });
    } catch { /* local sync */ }
    const current = getStoredRoutines();
    const updated = [...current, newItem];
    saveStoredRoutines(updated);
    return newItem;
  },

  async updateRoutine(id: string, updates: Partial<ReusableRoutine>): Promise<void> {
    try {
      await fetchJson(`${API_BASE}/learning`, {
        method: 'PUT',
        body: JSON.stringify({ type: 'routine', id, data: updates })
      });
    } catch { /* local sync */ }
    const current = getStoredRoutines();
    const updated = current.map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r);
    saveStoredRoutines(updated);
  },

  async deleteRoutine(id: string): Promise<void> {
    try {
      await fetchJson(`${API_BASE}/learning?tab=routines&id=${id}`, { method: 'DELETE' });
    } catch { /* local sync */ }
    const current = getStoredRoutines();
    saveStoredRoutines(current.filter(r => r.id !== id));
  },

  async exportLearningData(): Promise<any> {
    try {
      const data = await fetchJson<any>(`${API_BASE}/learning?export=json`);
      return data;
    } catch {
      return {
        version: '1.2.0',
        exportedAt: new Date().toISOString(),
        data: {
          preferences: getStoredPreferences(),
          corrections: getStoredCorrections(),
          documents: getStoredDocuments(),
          routines: getStoredRoutines()
        }
      };
    }
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
  },

  async getAuthStatus(): Promise<{
    success: boolean;
    authenticated: boolean;
    userId?: string;
    role?: string;
    passcodeRequired?: boolean;
    configured?: boolean;
    environment?: string;
    message?: string;
  }> {
    return fetchJson(`${API_BASE}/auth/status`);
  },

  async login(passcode: string): Promise<{
    success: boolean;
    token?: string;
    session?: { userId: string; role: string; expiresAt: number };
    error?: string;
    message?: string;
  }> {
    const res = await fetchJson<any>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ passcode })
    });
    if (res.success && res.token) {
      setSessionToken(res.token);
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await fetchJson(`${API_BASE}/auth/logout`, { method: 'POST' });
    } finally {
      setSessionToken('');
    }
  }
};
