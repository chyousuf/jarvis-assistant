import { Router, Request, Response } from 'express';
import { GMAIL_CONFIG, OUTLOOK_CONFIG } from '../config.js';
import { getDatabase, logActivity } from '../db/database.js';

const router = Router();

// Google OAuth Authorize
router.get('/google/authorize', (_req: Request, res: Response) => {
  if (!GMAIL_CONFIG.clientId) {
    res.status(400).send(`
      <h2>Google OAuth Not Configured</h2>
      <p>Please configure <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in your <code>server/.env</code> file.</p>
      <a href="http://localhost:5174">Return to JARVIS Console</a>
    `);
    return;
  }

  const scopes = encodeURIComponent([
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.readonly'
  ].join(' '));

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GMAIL_CONFIG.clientId}&redirect_uri=${encodeURIComponent(GMAIL_CONFIG.redirectUri)}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;

  res.redirect(authUrl);
});

// Google OAuth Callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) {
    res.status(400).send('Authorization code missing.');
    return;
  }

  try {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      code: code as string,
      client_id: GMAIL_CONFIG.clientId,
      client_secret: GMAIL_CONFIG.clientSecret,
      redirect_uri: GMAIL_CONFIG.redirectUri,
      grant_type: 'authorization_code'
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    const db = getDatabase();
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO oauth_tokens (provider, access_token, refresh_token, expires_at, scopes)
      VALUES ('google', ?, ?, ?, ?)
    `).run(tokens.access_token, tokens.refresh_token || null, expiresAt, tokens.scope || 'gmail.send');

    db.prepare("UPDATE integrations SET status = 'connected', updated_at = ? WHERE id = 'int-gmail'")
      .run(new Date().toISOString());

    logActivity('auth', 'google_connected', { scopes: tokens.scope });

    res.send(`
      <h2>Google Account Successfully Connected!</h2>
      <p>JARVIS can now draft and send emails with your explicit authorization.</p>
      <script>setTimeout(() => window.location.href = 'http://localhost:5174', 2000);</script>
    `);
  } catch (err: any) {
    res.status(500).send(`Authentication error: ${err.message}`);
  }
});

// Microsoft OAuth Authorize
router.get('/microsoft/authorize', (_req: Request, res: Response) => {
  if (!OUTLOOK_CONFIG.clientId) {
    res.status(400).send(`
      <h2>Microsoft 365 OAuth Not Configured</h2>
      <p>Please configure <code>MICROSOFT_CLIENT_ID</code> and <code>MICROSOFT_CLIENT_SECRET</code> in your <code>server/.env</code> file.</p>
      <a href="http://localhost:5174">Return to JARVIS Console</a>
    `);
    return;
  }

  const scopes = encodeURIComponent('offline_access Mail.Send Mail.ReadWrite Calendars.ReadWrite');
  const authUrl = `https://login.microsoftonline.com/${OUTLOOK_CONFIG.tenantId}/oauth2/v2.0/authorize?client_id=${OUTLOOK_CONFIG.clientId}&response_type=code&redirect_uri=${encodeURIComponent(OUTLOOK_CONFIG.redirectUri)}&response_mode=query&scope=${scopes}&prompt=consent`;

  res.redirect(authUrl);
});

// Disconnect an integration
router.post('/disconnect/:provider', (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM oauth_tokens WHERE provider = ?').run(provider);

    const intId = provider === 'google' ? 'int-gmail' : provider === 'microsoft' ? 'int-outlook' : 'int-whatsapp';
    db.prepare("UPDATE integrations SET status = 'demo', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), intId);

    logActivity('auth', 'disconnected', { provider });

    res.json({ success: true, message: `${provider} successfully disconnected.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
