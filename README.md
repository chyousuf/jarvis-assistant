# J.A.R.V.I.S. — Multi-Modal Personal AI Assistant & Computer Controller (v1.2)

An autonomous, multi-modal personal AI assistant inspired by JARVIS. Accepts voice and text commands in **English, Urdu, and mixed-language**, controls your macOS computer (launches apps, opens websites, types text at active cursors, inspects frontmost windows, reads documents aloud, finds files), resolves approved contacts with ambiguity detection, and executes real tasks across **WhatsApp Business Platform**, **OAuth Email (Gmail & Outlook)**, **Calendar & Availability**, **Task Chains**, **Sandboxed Storage**, and **Persistent Reminders**.

---

## What's New in v1.2: Computer Control & macOS Automation

1. **Native Application Activation & Smart Fallbacks**:
   - *"Open WhatsApp"* &rarr; Launches native WhatsApp macOS desktop application; if not installed, cleanly launches WhatsApp Web (`https://web.whatsapp.com`).
   - *"Open Word and write a job application"* &rarr; Launches Microsoft Word, generating a structured cover letter draft; if Word is not installed, gracefully activates TextEdit.
   - Intelligent detection of Microsoft Office, Apple TextEdit, Google Chrome, Safari, and messaging apps.

2. **Browser Automation & Media Search**:
   - *"Open YouTube and search for cooking videos"* &rarr; Activates default browser and navigates directly to the YouTube search results.
   - General search execution for Google and YouTube.

3. **Active Cursor Typing & Direct Window Text Injection**:
   - *"Write hello here"* &rarr; Types directly into whatever text field or document cursor is currently selected on your screen using system clipboard synchronization and macOS automation.

4. **Screen & Active Document Inspection**:
   - *"Read this"* / *"Read active document"* &rarr; Inspects the frontmost application's selected text or accessibility text area and reads it aloud via native macOS speech synthesis (`say`).
   - *"Summarize this page"* &rarr; Reads the active window content and produces a structured summary.
   - Screen capture primitive (`screencapture -x`) snapshots current desktop state to the authorized workspace.

5. **Safe File Discovery**:
   - *"Find my downloaded invoice"* &rarr; Scans scoped authorized folders (`~/Downloads`, `~/Documents`, `~/Desktop`, and `workspace`) with `mdfind` fast indexing and opens the matching file automatically with the system default viewer.

6. **Instant Emergency Stop**:
   - Saying *"Stop"* or *"Ruko"* immediately terminates active speech synthesis (`killall say`) and cancels running computer actions.
   - Universal red STOP button in the client header and Computer Control dashboard.

7. **Computer Control HUD Panel & Permissions Checklist**:
   - Dedicated "Computer" dashboard in the client providing real-time frontmost application polling, window title classification, permission status (Accessibility, Automation, Screen Capture, Speech), and quick action buttons.

---

## What's New in v1.1

1. **Meta WhatsApp Business Platform (Cloud API)**:
   - Voice and text commands: *"Send a WhatsApp message to Ahmed saying I will be 10 minutes late."* (and in Urdu: *"Ahmed ko WhatsApp message bhejo..."*).
   - Recipient resolution from approved contacts book. If multiple contacts match (e.g. *Ahmed Raza* vs *Ahmed Khan*), JARVIS automatically halts and prompts you to choose.
   - Shows exact recipient and message, then requests explicit confirmation before transmission.
   - Adheres to Meta policies: distinguishes 24h customer care window vs message templates.
   - Differentiates delivery statuses: `Accepted` vs `Sent` vs `Delivered` vs `Read`. Never marks "delivered" prematurely based solely on send acceptance.
   - **Supported Handoff**: If Cloud API credentials are not yet configured or personal handoff is needed, prepares the message with a direct `wa.me` handoff link for instant user sending.

2. **Email Communications (Gmail & Outlook OAuth)**:
   - Connect Gmail and Microsoft 365 Outlook through secure OAuth 2.0.
   - Immediate drafting: *"Draft an email to Ali about tomorrow's meeting."*
   - Displays exact recipients, subject, body, and attachments before requesting confirmation to send.
   - Reply to threads and attach files selected from the sandboxed workspace.
   - Idempotency deduplication keys prevent duplicate sends when retrying requests.

3. **Calendar & Scheduling**:
   - Availability checking: *"Check my schedule for tomorrow"* finds free appointment windows.
   - Schedule meetings with attendee invitations confirmation gate.
   - Timezone awareness (default: `Asia/Karachi`).

4. **Task Chains**:
   - Handles multi-step chains: *"Research quantum computing, create a report named quantum_ai_report.md, then draft an email to Ali with the report attached."*
   - Passes verified artifacts between tools and halts before any external message is dispatched.

5. **Multilingual Voice & Voice Confirmation Binding**:
   - Supports English, Urdu, and mixed Roman-Urdu voice input.
   - Voice confirmation commands (*"approve"*, *"confirm"*, *"theek hai"*, *"manzoor hai"*, *"cancel"*) automatically bind to the active pending authorization request.

6. **Connections & Permissions Page**:
   - Central dashboard displaying granted scopes, connection status, disconnect controls, and setup guides.

---

## Architecture Overview

```
AiProjects/jarvis/
├── client/                              # Modern React 19 + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── components/                  # Header, ChatInterface, TaskDashboard, EmailDashboard,
│   │   │                                # WhatsAppDashboard, CalendarDashboard, WorkspaceModal,
│   │   │                                # RemindersModal, ConnectionsModal, ActivityLogModal
│   │   ├── services/
│   │   │   ├── api.ts                   # REST & SSE Telemetry Client
│   │   │   └── voice.ts                 # Multilingual Web Speech Engine (EN / UR, Push-to-Talk, Wake Word)
│   │   ├── App.tsx                      # Root HUD shell with real-time SSE stream listeners
│   │   └── index.css                    # Dark HUD aesthetic with subtle cyan/blue accents
│   └── vite.config.ts                   # Proxy configuration to Port 4001
├── server/                              # Node.js + Express + TypeScript + SQLite Engine
│   ├── src/
│   │   ├── ai/
│   │   │   ├── orchestrator.ts          # Intent, multilingual parsing, task chains, voice confirmation binding
│   │   │   └── sanitizer.ts             # Untrusted content boundaries & prompt injection defense
│   │   ├── tools/
│   │   │   ├── contacts.ts              # Approved contacts book & ambiguity detector
│   │   │   ├── emailService.ts          # OAuth email drafting, attachments, idempotency deduplication
│   │   │   ├── whatsappService.ts       # Meta Cloud API, template eligibility, delivery states, wa.me handoff
│   │   │   ├── calendarService.ts       # Availability check, event scheduling, invitation confirmation
│   │   │   ├── documentService.ts       # Formal letters, reports, notes, printable HTML/PDF
│   │   │   ├── registry.ts              # Tool catalog with safety gates & outcome verifiers
│   │   │   ├── workspaceFiles.ts        # Sandboxed file manager with directory traversal prevention
│   │   │   ├── webSearch.ts             # Live DuckDuckGo web research with prompt injection wrapping
│   │   │   ├── reminders.ts             # Persistent SQLite reminder scheduler & background runner
│   │   │   └── memoryTool.ts            # User preference memory manager
│   │   ├── tasks/
│   │   │   ├── taskRunner.ts            # Asynchronous multi-step runner, cancellation tokens, SSE broadcasting
│   │   │   └── approvalManager.ts       # Human-in-the-loop authorization gates for sensitive actions
│   │   ├── routes/                      # Chat, Tasks, Contacts, Emails, WhatsApp, Calendar, OAuth, Files, Reminders, Activity
│   │   ├── db/database.ts               # Native node:sqlite DatabaseSync with WAL mode & busy_timeout
│   │   └── index.ts                     # Express server & SSE telemetry streaming (/events)
│   ├── tests/                           # 13 automated test suites for security, sandbox, approvals, contacts, emails
│   └── .env.example                     # Environment template
├── workspace/                           # Approved, sandboxed storage directory for files
├── start.js                             # Concurrent launcher for both Server and Client
└── package.json
```

---

## Running the Automated Test Suite

```bash
cd /Users/chaudhryyousaf/Desktop/AiProjects/jarvis/server
npm test
```
The test suite validates:
1. Contact resolution and recipient ambiguity flagging.
2. Immediate email drafting, attachment validation, and idempotency deduplication.
3. WhatsApp recipient resolution, delivery state separation, and supported handoffs.
4. Calendar availability checks and attendee invitation confirmation gates.
5. Document generation in workspace.
6. Voice confirmation binding (*"theek hai"* / *"approve"*).
7. Sandboxed storage directory traversal defense.
8. Sensitive action approval gates.
9. Task cancellation tokens.
10. Persistent SQLite reminders.
11. Memory storage and user deletion.
12. Untrusted content sanitization against prompt injection.

---

## Account Setup & Credentials Guide

### 1. Google Gmail OAuth 2.0
1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Gmail API** in *APIs & Services*.
3. Configure the OAuth Consent Screen (add scopes: `gmail.send`, `gmail.compose`, `gmail.readonly`).
4. Create an OAuth 2.0 Web Client ID with redirect URI: `http://localhost:4001/api/oauth/google/callback`.
5. Add client credentials to `jarvis/server/.env`:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```
6. Open the **Connections** tab in the JARVIS HUD and click **Connect OAuth 2.0**.

### 2. Microsoft 365 Outlook OAuth 2.0
1. Open [Microsoft Entra Admin Center](https://entra.microsoft.com/) &rarr; App registrations.
2. Register an application and add redirect URI: `http://localhost:4001/api/oauth/microsoft/callback`.
3. Add API permissions: `Mail.Send`, `Mail.ReadWrite`, `Calendars.ReadWrite`.
4. Add client credentials to `jarvis/server/.env`:
```env
MICROSOFT_CLIENT_ID=your_app_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=common
```

### 3. Meta WhatsApp Business Platform (Cloud API)
1. Navigate to [developers.facebook.com](https://developers.facebook.com/) and create a Business App.
2. Add the **WhatsApp** product.
3. From the WhatsApp Getting Started page, copy your **Phone Number ID** and generate a **System User Access Token** with `whatsapp_business_messaging` permission.
4. Add to `jarvis/server/.env`:
```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
```
> **Note on WhatsApp Policies**: Direct sending via the API requires recipient opt-in and pre-approved Meta message templates for messages initiated outside the 24-hour window. If credentials are not configured, JARVIS automatically uses the clean supported handoff URL (`https://wa.me/<phone>?text=...`) so you can transmit directly.

---

## macOS Permissions Setup (For Computer Control)

JARVIS leverages macOS native automation primitives (`osascript`, `System Events`, `screencapture`, `say`, and `mdfind`). For full capabilities:

1. **Accessibility**:
   - Go to **System Settings** &rarr; **Privacy & Security** &rarr; **Accessibility**.
   - Enable your terminal emulator (e.g. `Terminal`, `iTerm`, `VS Code`, or `Antigravity`). This permits active window detection, reading selections, and typing text.
2. **Screen Recording**:
   - Go to **System Settings** &rarr; **Privacy & Security** &rarr; **Screen Recording**.
   - Enable your terminal or runner application to allow screen snapshots.
3. **Graceful Fallback**:
   - Even without explicit accessibility permissions granted, JARVIS places generated text onto the system clipboard (`pbcopy`), allowing immediate `Cmd+V` manual pasting without interruption or crash.

---

## Quick Start

```bash
cd /Users/chaudhryyousaf/Desktop/AiProjects/jarvis
node start.js
```
- **Web Dashboard**: [http://localhost:5174](http://localhost:5174)
- **Backend API**: [http://localhost:4001](http://localhost:4001)
- **Telemetry Stream**: [http://localhost:4001/events](http://localhost:4001/events)
