import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export const PORT = parseInt(process.env.PORT || '4001', 10);
export const HOST = process.env.HOST || '0.0.0.0';

// Approved isolated workspace directory
export const WORKSPACE_DIR = process.env.JARVIS_WORKSPACE_DIR
  ? path.resolve(process.env.JARVIS_WORKSPACE_DIR)
  : path.resolve(__dirname, '../../workspace');

// Ensure workspace directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Database path
export const DB_PATH = process.env.JARVIS_DB_PATH
  ? path.resolve(process.env.JARVIS_DB_PATH)
  : path.resolve(__dirname, '../jarvis.sqlite');

// Default Timezone
export const APP_TIMEZONE = process.env.TZ || 'Asia/Karachi';

// AI Configuration
export const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : process.env.GEMINI_API_KEY ? 'gemini' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'builtin'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  modelName: process.env.AI_MODEL || 'default'
};

// WhatsApp Business Platform (Cloud API) Configuration
export const WHATSAPP_CONFIG = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  apiVersion: 'v21.0'
};

// Gmail OAuth Configuration
export const GMAIL_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4001/api/oauth/google/callback'
};

// Outlook / Microsoft 365 OAuth Configuration
export const OUTLOOK_CONFIG = {
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:4001/api/oauth/microsoft/callback'
};
