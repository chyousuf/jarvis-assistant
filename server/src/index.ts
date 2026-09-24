import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PORT, HOST, WORKSPACE_DIR, DB_PATH, APP_TIMEZONE } from './config.js';
import { getDatabase, getActivityLogs } from './db/database.js';
import chatRouter from './routes/chat.js';
import tasksRouter from './routes/tasks.js';
import remindersRouter from './routes/reminders.js';
import memoryRouter from './routes/memory.js';
import filesRouter from './routes/files.js';
import integrationsRouter from './routes/integrations.js';
import contactsRouter from './routes/contacts.js';
import emailsRouter from './routes/emails.js';
import whatsappRouter from './routes/whatsapp.js';
import calendarRouter from './routes/calendar.js';
import oauthRouter from './routes/oauth.js';
import computerRouter from './routes/computer.js';
import companionRouter, { pairingToken, TOKEN_FILE } from './routes/companion.js';
import voiceRouter from './routes/voice.js';
import aiRouter from './routes/ai.js';
import { subscribeToTaskEvents } from './tasks/taskRunner.js';
import { pollDueReminders } from './tools/reminders.js';

const app = express();

const ALLOWED_ORIGINS = [
  'https://jarvis-assistant-pi-dun.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string;
  if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ai-api-key, x-ai-provider, x-jarvis-passcode');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health / Status endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    assistant: 'J.A.R.V.I.S.',
    version: '1.1.0',
    timezone: APP_TIMEZONE,
    workspace: WORKSPACE_DIR,
    database: DB_PATH,
    timestamp: new Date().toISOString()
  });
});

// Activity logs endpoint (Sanitized, no secrets)
app.get('/api/activity', (_req: Request, res: Response) => {
  const logs = getActivityLogs(40);
  res.json({ success: true, logs });
});

// Mount Routes
app.use('/api/chat', chatRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/files', filesRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/oauth', oauthRouter);
app.use('/api/computer', computerRouter);
app.use('/api/companion', companionRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/ai', aiRouter);

// Server-Sent Events (SSE) for Real-Time Telemetry & Progress
const sseClients = new Set<Response>();

app.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'JARVIS Telemetry Stream Online' })}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

function broadcastSSE(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Forward Task runner events to connected clients
subscribeToTaskEvents((event) => {
  broadcastSSE(event.type, event.data);
});

// Periodic reminder checking (every 5 seconds)
setInterval(() => {
  try {
    const fired = pollDueReminders();
    for (const rem of fired) {
      broadcastSSE('reminder:due', rem);
    }
  } catch {
    // Suppress error
  }
}, 5000);

// Initialize SQLite database
getDatabase();

app.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ J.A.R.V.I.S. Core Engine Initialized (v1.1.0)`);
  console.log(`🌐 Server running at: http://${HOST}:${PORT}`);
  console.log(`🕒 Server Timezone: ${APP_TIMEZONE}`);
  console.log(`📁 Sandboxed Workspace: ${WORKSPACE_DIR}`);
  console.log(`💾 SQLite Database: ${DB_PATH}`);
  console.log(`🔐 Companion Pairing Token: ${pairingToken}`);
  console.log(`📡 Telemetry SSE Stream: http://${HOST}:${PORT}/events`);
  console.log(`======================================================\n`);
});

export default app;
