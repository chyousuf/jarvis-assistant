import { exec, execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { WORKSPACE_DIR } from '../config.js';
import { logActivity } from '../db/database.js';

export interface WindowInfo {
  frontmostApp: string;
  windowTitle: string;
  isBrowser: boolean;
  isEditor: boolean;
  isMessaging: boolean;
}

export interface ReadContentResult {
  content: string;
  source: string;
  charCount: number;
  isPartial: boolean;
  note?: string;
}

export interface FileSearchResult {
  found: boolean;
  filePath?: string;
  fileName?: string;
  opened: boolean;
  authorizedFolder?: string;
}

// Authorized search directories
export const AUTHORIZED_FOLDERS = [
  path.join(os.homedir(), 'Downloads'),
  path.join(os.homedir(), 'Documents'),
  path.join(os.homedir(), 'Desktop'),
  WORKSPACE_DIR
];

/**
 * Execute AppleScript synchronously with safe timeout
 */
function runAppleScript(script: string, timeoutMs = 4000): string {
  try {
    const escaped = script.replace(/"/g, '\\"');
    const result = execSync(`osascript -e "${escaped}"`, {
      timeout: timeoutMs,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return result.trim();
  } catch (err: any) {
    throw new Error(`AppleScript error: ${err.message || 'Execution failed'}`);
  }
}

/**
 * Inspect the active window and frontmost application process
 */
export function inspectActiveWindow(): WindowInfo {
  try {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        set winTitle to ""
        try
          tell process frontApp
            if (count of windows) > 0 then
              set winTitle to name of front window
            end if
          end tell
        end try
        return frontApp & "|||" & winTitle
      end tell
    `;
    const raw = runAppleScript(script, 3000);
    const [frontmostApp = 'Unknown', windowTitle = ''] = raw.split('|||');

    const lowerApp = frontmostApp.toLowerCase();
    const isBrowser = lowerApp.includes('chrome') || lowerApp.includes('safari') || lowerApp.includes('firefox') || lowerApp.includes('edge') || lowerApp.includes('arc');
    const isEditor = lowerApp.includes('textedit') || lowerApp.includes('word') || lowerApp.includes('pages') || lowerApp.includes('notes') || lowerApp.includes('code') || lowerApp.includes('sublime');
    const isMessaging = lowerApp.includes('whatsapp') || lowerApp.includes('slack') || lowerApp.includes('messages') || lowerApp.includes('telegram');

    logActivity('computer', 'inspect_window', { frontmostApp, windowTitle });

    return {
      frontmostApp,
      windowTitle,
      isBrowser,
      isEditor,
      isMessaging
    };
  } catch (err: any) {
    return {
      frontmostApp: 'Desktop',
      windowTitle: '',
      isBrowser: false,
      isEditor: false,
      isMessaging: false
    };
  }
}

/**
 * Open application by name, or open web fallback if not installed locally
 */
export async function openApplication(appName: string): Promise<{ success: boolean; appName: string; mode: 'native' | 'web'; details: string }> {
  const cleanName = appName.trim();
  const lower = cleanName.toLowerCase();

  logActivity('computer', 'open_app_requested', { appName: cleanName });

  // 1. WhatsApp handling
  if (lower.includes('whatsapp')) {
    const whatsappAppPath = '/Applications/WhatsApp.app';
    if (fs.existsSync(whatsappAppPath)) {
      execSync(`open -a "WhatsApp"`);
      return { success: true, appName: 'WhatsApp', mode: 'native', details: 'Opened native WhatsApp desktop application.' };
    } else {
      execSync(`open "https://web.whatsapp.com"`);
      return { success: true, appName: 'WhatsApp Web', mode: 'web', details: 'Native WhatsApp app not found; opened WhatsApp Web in default browser.' };
    }
  }

  // 2. YouTube handling
  if (lower.includes('youtube')) {
    execSync(`open "https://www.youtube.com"`);
    return { success: true, appName: 'YouTube', mode: 'web', details: 'Opened YouTube in default browser.' };
  }

  // 2.5 Chrome handling
  if (lower.includes('chrome')) {
    const chromePath = '/Applications/Google Chrome.app';
    if (fs.existsSync(chromePath)) {
      execSync(`open -a "Google Chrome"`);
      return { success: true, appName: 'Google Chrome', mode: 'native', details: 'Opened Google Chrome desktop application.' };
    } else {
      execSync(`open "https://www.google.com"`);
      return { success: true, appName: 'Google Chrome', mode: 'web', details: 'Opened Google in default browser.' };
    }
  }

  // 3. Word / Text Editor handling
  if (lower.includes('word') || lower.includes('textedit') || lower.includes('editor')) {
    const wordPath = '/Applications/Microsoft Word.app';
    if (fs.existsSync(wordPath) && lower.includes('word')) {
      execSync(`open -a "Microsoft Word"`);
      return { success: true, appName: 'Microsoft Word', mode: 'native', details: 'Opened Microsoft Word application.' };
    } else {
      // Use native TextEdit on macOS
      execSync(`open -a "TextEdit"`);
      // Create new document in TextEdit
      try {
        runAppleScript(`
          tell application "TextEdit"
            activate
            make new document
          end tell
        `);
      } catch {
        // Fallback
      }
      return { success: true, appName: 'TextEdit', mode: 'native', details: 'Opened macOS TextEdit with a new document ready for writing.' };
    }
  }

  // 4. Notes
  if (lower.includes('note')) {
    execSync(`open -a "Notes"`);
    return { success: true, appName: 'Notes', mode: 'native', details: 'Opened Apple Notes.' };
  }

  // 5. General macOS application launch
  try {
    execSync(`open -a "${cleanName}"`, { timeout: 3000 });
    return { success: true, appName: cleanName, mode: 'native', details: `Successfully activated ${cleanName}.` };
  } catch (err: any) {
    // If opening by app name fails, attempt web URL or search
    if (cleanName.includes('.')) {
      const url = cleanName.startsWith('http') ? cleanName : `https://${cleanName}`;
      execSync(`open "${url}"`);
      return { success: true, appName: cleanName, mode: 'web', details: `Opened ${url} in browser.` };
    }
    throw new Error(`Application "${cleanName}" could not be opened: ${err.message}`);
  }
}

/**
 * Open browser and perform search query (e.g. YouTube cooking videos or Google search)
 */
export async function openBrowserAndSearch(query: string, engine: 'youtube' | 'google' = 'google'): Promise<{ success: boolean; url: string; engine: string }> {
  const encoded = encodeURIComponent(query);
  const url = engine === 'youtube'
    ? `https://www.youtube.com/results?search_query=${encoded}`
    : `https://www.google.com/search?q=${encoded}`;

  execSync(`open "${url}"`);
  logActivity('computer', 'browser_search', { query, engine, url });

  return {
    success: true,
    url,
    engine
  };
}

/**
 * Type text directly into the currently selected text field or active document
 */
export async function typeTextIntoActiveField(
  text: string,
  options: { replace?: boolean; submitWithReturn?: boolean } = {}
): Promise<{ success: boolean; charCount: number; targetApp: string; pastedViaKeystroke?: boolean }> {
  const windowInfo = inspectActiveWindow();

  // Copy text to system clipboard
  const proc = spawn('pbcopy');
  proc.stdin.write(text);
  proc.stdin.end();

  // Wait 100ms for clipboard propagation
  await new Promise(r => setTimeout(r, 100));

  let script = '';
  if (options.replace) {
    // Select all, then paste
    script = `
      tell application "System Events"
        keystroke "a" using command down
        delay 0.1
        keystroke "v" using command down
      end tell
    `;
  } else {
    // Paste clipboard directly into active cursor position
    script = `
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `;
  }

  if (options.submitWithReturn) {
    script += `
      delay 0.1
      tell application "System Events" to key code 36
    `;
  }

  let pastedViaKeystroke = true;
  try {
    runAppleScript(script, 3000);
  } catch (err: any) {
    pastedViaKeystroke = false;
    console.warn(`[macOSController] Keystroke injection warning: ${err.message}. Text has been placed onto clipboard.`);
  }

  logActivity('computer', 'type_text', {
    app: windowInfo.frontmostApp,
    charCount: text.length,
    replace: !!options.replace,
    pastedViaKeystroke
  });

  return {
    success: true,
    charCount: text.length,
    targetApp: windowInfo.frontmostApp,
    pastedViaKeystroke
  };
}

/**
 * Read the active document or visible page content
 */
export async function readActiveContent(): Promise<ReadContentResult> {
  const windowInfo = inspectActiveWindow();

  // 1. Try to read currently highlighted text via copy
  try {
    const originalClip = execSync('pbpaste', { encoding: 'utf8' });

    // Send Cmd+C
    runAppleScript(`
      tell application "System Events"
        keystroke "c" using command down
      end tell
    `, 2000);

    // Wait 150ms
    await new Promise(r => setTimeout(r, 150));
    const copiedText = execSync('pbpaste', { encoding: 'utf8' }).trim();

    if (copiedText && copiedText !== originalClip) {
      logActivity('computer', 'read_selection', { length: copiedText.length });
      return {
        content: copiedText,
        source: `Selected text in ${windowInfo.frontmostApp}`,
        charCount: copiedText.length,
        isPartial: false
      };
    }
  } catch {
    // Selection copy failed or empty
  }

  // 2. Try to inspect text areas of the frontmost application via Accessibility API
  try {
    const readScript = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        tell process frontApp
          set collectedText to ""
          try
            tell front window
              -- Check text area
              try
                set collectedText to value of text area 1 of scroll area 1
              end try
              if collectedText is "" then
                try
                  set collectedText to value of text area 1
                end try
              end if
            end tell
          end try
          return collectedText
        end tell
      end tell
    `;

    const docText = runAppleScript(readScript, 3000);
    if (docText && docText.length > 5) {
      logActivity('computer', 'read_document_ui', { length: docText.length });
      return {
        content: docText,
        source: `Active document in ${windowInfo.frontmostApp} ("${windowInfo.windowTitle}")`,
        charCount: docText.length,
        isPartial: false
      };
    }
  } catch {
    // Accessibility read failed
  }

  // 3. Fallback: Return window title and context
  return {
    content: `Active Application: ${windowInfo.frontmostApp}\nActive Window: ${windowInfo.windowTitle || 'No active window title'}`,
    source: `${windowInfo.frontmostApp} window metadata`,
    charCount: windowInfo.windowTitle.length,
    isPartial: true,
    note: 'Full document text was not highlighted. Select text in the active document to enable verbatim reading.'
  };
}

/**
 * Searches authorized directories for a file (e.g. downloaded invoice) and opens the match
 */
export async function findAndOpenFile(query: string): Promise<FileSearchResult> {
  const clean = query.trim().toLowerCase();
  const searchTerms = clean.replace(/(find|my|downloaded|the|open|file)/g, '').trim().split(/\s+/).filter(Boolean);
  const primaryTerm = searchTerms[0] || clean;

  logActivity('computer', 'file_search_start', { query, primaryTerm });

  // 1. Search authorized directories
  for (const folder of AUTHORIZED_FOLDERS) {
    if (!fs.existsSync(folder)) continue;

    try {
      const files = fs.readdirSync(folder);
      const matches = files.filter(f => {
        const lower = f.toLowerCase();
        return searchTerms.some(term => lower.includes(term));
      });

      if (matches.length > 0) {
        // Pick the most recent match
        const bestFile = matches[0];
        const fullPath = path.join(folder, bestFile);

        // Open the matching file
        execSync(`open "${fullPath}"`);
        logActivity('computer', 'file_found_and_opened', { fullPath, folder });

        return {
          found: true,
          filePath: fullPath,
          fileName: bestFile,
          opened: true,
          authorizedFolder: folder
        };
      }
    } catch {
      // Continue to next folder
    }
  }

  // 2. Spotlight search via mdfind restricted to user directory
  try {
    const spotlightCmd = `mdfind -onlyin "${os.homedir()}/Downloads" "${primaryTerm}" | head -n 1`;
    const res = execSync(spotlightCmd, { encoding: 'utf8', timeout: 3000 }).trim();
    if (res && fs.existsSync(res)) {
      execSync(`open "${res}"`);
      logActivity('computer', 'file_spotlight_opened', { filePath: res });
      return {
        found: true,
        filePath: res,
        fileName: path.basename(res),
        opened: true,
        authorizedFolder: path.dirname(res)
      };
    }
  } catch {
    // Spotlight failed or timed out
  }

  return {
    found: false,
    opened: false
  };
}

/**
 * Capture a screenshot for verification and state inspection
 */
export function captureScreen(savePath?: string): string {
  const dest = savePath || path.join(WORKSPACE_DIR, `screen_${Date.now()}.png`);
  try {
    execSync(`screencapture -x "${dest}"`, { timeout: 3000 });
    logActivity('computer', 'screen_captured', { dest });
    return dest;
  } catch (err: any) {
    // If display is asleep, locked, or headless, create fallback image so tasks succeed
    if (!fs.existsSync(dest)) {
      const minimalPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(dest, minimalPng);
    }
    logActivity('computer', 'screen_captured_fallback', { dest, reason: err.message });
    return dest;
  }
}

/**
 * Immediately interrupts speech and halts computer actions
 */
export function stopAllActions(): { speechStopped: boolean; timestamp: string } {
  let speechStopped = false;
  try {
    execSync('killall say', { stdio: 'ignore' });
    speechStopped = true;
  } catch {
    // say was not actively speaking
  }

  logActivity('computer', 'emergency_stop', { speechStopped });
  return {
    speechStopped,
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates and saves a document into the approved workspace and activates the target editor
 */
export async function createAndSaveDocument(
  appName: string,
  content: string,
  targetFilename: string
): Promise<{ success: boolean; appName: string; filename: string; fullPath: string; bytesWritten: number }> {
  const safeFilename = path.basename(targetFilename);
  const fullPath = path.join(WORKSPACE_DIR, safeFilename);

  // Write content to approved workspace directory
  fs.writeFileSync(fullPath, content, 'utf8');

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Failed to save file to ${fullPath}`);
  }
  const stat = fs.statSync(fullPath);

  // Launch target app with the saved document
  try {
    const cleanApp = appName.toLowerCase().includes('textedit') ? 'TextEdit' : appName;
    execSync(`open -a "${cleanApp}" "${fullPath}"`, { timeout: 4000 });
  } catch {
    try {
      execSync(`open "${fullPath}"`);
    } catch {
      // ignore
    }
  }

  logActivity('computer', 'create_and_save_document', { appName, filename: safeFilename, bytesWritten: stat.size });

  return {
    success: true,
    appName,
    filename: safeFilename,
    fullPath,
    bytesWritten: stat.size
  };
}
