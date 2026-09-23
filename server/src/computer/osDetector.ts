import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

export interface OSPermissionStatus {
  osType: string;
  osRelease: string;
  isMacOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
  accessibilityGranted: boolean;
  automationGranted: boolean;
  screenCaptureGranted: boolean;
  speechSynthesisGranted: boolean;
  details: string;
}

/**
 * Detects the host operating system and verifies macOS accessibility and automation permissions.
 */
export function detectOSAndPermissions(): OSPermissionStatus {
  const platform = os.platform();
  const release = os.release();
  const isMacOS = platform === 'darwin';
  const isWindows = platform === 'win32';
  const isLinux = platform === 'linux';

  let accessibilityGranted = false;
  let automationGranted = false;
  let screenCaptureGranted = false;
  let speechSynthesisGranted = false;
  let details = '';

  if (isMacOS) {
    // 1. Check AppleScript / System Events accessibility permission
    try {
      const res = execSync(
        `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
        { timeout: 2000, encoding: 'utf8' }
      ).trim();
      if (res) {
        accessibilityGranted = true;
        automationGranted = true;
      }
    } catch (e: any) {
      accessibilityGranted = false;
      automationGranted = false;
      details += 'System Events accessibility permission not yet granted or prompted. ';
    }

    // 2. Check screencapture capability
    try {
      const tempPath = path.join(os.tmpdir(), `jarvis_perm_check_${Date.now()}.png`);
      execSync(`screencapture -x "${tempPath}"`, { timeout: 3000 });
      if (fs.existsSync(tempPath)) {
        screenCaptureGranted = true;
        fs.unlinkSync(tempPath);
      }
    } catch {
      screenCaptureGranted = false;
      details += 'Screen Recording permission check failed. ';
    }

    // 3. Speech synthesis ('say' binary)
    try {
      execSync('which say', { timeout: 1000 });
      speechSynthesisGranted = true;
    } catch {
      speechSynthesisGranted = false;
    }
  } else {
    details = `Platform is ${platform}. macOS accessibility primitives are primary; generic fallback active.`;
  }

  return {
    osType: platform,
    osRelease: release,
    isMacOS,
    isWindows,
    isLinux,
    accessibilityGranted,
    automationGranted,
    screenCaptureGranted,
    speechSynthesisGranted,
    details: details || 'All primary macOS computer-control permissions operational.'
  };
}
