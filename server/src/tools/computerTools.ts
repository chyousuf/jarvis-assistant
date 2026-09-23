import {
  openApplication,
  openBrowserAndSearch,
  typeTextIntoActiveField,
  readActiveContent,
  findAndOpenFile,
  inspectActiveWindow,
  captureScreen,
  stopAllActions,
  createAndSaveDocument,
  WindowInfo,
  ReadContentResult,
  FileSearchResult
} from '../computer/macOSController.js';
import { detectOSAndPermissions, OSPermissionStatus } from '../computer/osDetector.js';

export const computerTools = {
  async openApp(appName: string) {
    return await openApplication(appName);
  },

  async openSearch(query: string, engine: 'youtube' | 'google' = 'google') {
    return await openBrowserAndSearch(query, engine);
  },

  async typeText(text: string, options?: { replace?: boolean; submitWithReturn?: boolean }) {
    return await typeTextIntoActiveField(text, options);
  },

  async readActive(): Promise<ReadContentResult> {
    return await readActiveContent();
  },

  async findFile(query: string): Promise<FileSearchResult> {
    return await findAndOpenFile(query);
  },

  inspectWindow(): WindowInfo {
    return inspectActiveWindow();
  },

  captureScreen(): { success: boolean; imagePath: string } {
    const p = captureScreen();
    return { success: true, imagePath: p };
  },

  stop(): { speechStopped: boolean; timestamp: string } {
    return stopAllActions();
  },

  getOSStatus(): OSPermissionStatus {
    return detectOSAndPermissions();
  },

  async createDocument(appName: string, content: string, targetFilename: string) {
    return await createAndSaveDocument(appName, content, targetFilename);
  }
};
