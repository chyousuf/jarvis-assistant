import path from 'path';
import fs from 'fs';
import { WORKSPACE_DIR } from '../config.js';

export interface FileItem {
  name: string;
  relativePath: string;
  size: number;
  updatedAt: string;
  isDirectory: boolean;
}

/**
 * Validates and resolves a relative path within the approved workspace.
 * Prevents directory traversal attacks (e.g., ../../etc/passwd).
 */
export function resolveSafePath(relativePath: string): string {
  // Normalize and resolve path relative to WORKSPACE_DIR
  const resolved = path.resolve(WORKSPACE_DIR, relativePath);

  // Security check: Must start with WORKSPACE_DIR
  if (!resolved.startsWith(WORKSPACE_DIR)) {
    throw new Error(`Security Violation: Path "${relativePath}" resolves outside approved workspace boundary (${WORKSPACE_DIR}). Access denied.`);
  }

  return resolved;
}

/**
 * Create or overwrite a file in the workspace
 */
export async function createWorkspaceFile(relativePath: string, content: string): Promise<{ success: boolean; filePath: string; bytesWritten: number }> {
  const safePath = resolveSafePath(relativePath);
  const dir = path.dirname(safePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(safePath, content, 'utf8');
  const stats = fs.statSync(safePath);

  return {
    success: true,
    filePath: relativePath,
    bytesWritten: stats.size
  };
}

/**
 * Read a file from the workspace
 */
export async function readWorkspaceFile(relativePath: string): Promise<{ content: string; size: number; updatedAt: string }> {
  const safePath = resolveSafePath(relativePath);

  if (!fs.existsSync(safePath)) {
    throw new Error(`File "${relativePath}" not found in workspace.`);
  }

  const stats = fs.statSync(safePath);
  if (stats.isDirectory()) {
    throw new Error(`Path "${relativePath}" is a directory, not a file.`);
  }

  const content = fs.readFileSync(safePath, 'utf8');
  return {
    content,
    size: stats.size,
    updatedAt: stats.mtime.toISOString()
  };
}

/**
 * List files and directories in the workspace
 */
export async function listWorkspaceFiles(subDir = ''): Promise<FileItem[]> {
  const safePath = resolveSafePath(subDir);

  if (!fs.existsSync(safePath)) {
    return [];
  }

  const items = fs.readdirSync(safePath, { withFileTypes: true });
  const results: FileItem[] = [];

  for (const item of items) {
    // Skip hidden files like .DS_Store
    if (item.name.startsWith('.')) continue;

    const fullItemPath = path.join(safePath, item.name);
    const relItemPath = path.relative(WORKSPACE_DIR, fullItemPath);
    const stats = fs.statSync(fullItemPath);

    results.push({
      name: item.name,
      relativePath: relItemPath,
      size: stats.size,
      updatedAt: stats.mtime.toISOString(),
      isDirectory: item.isDirectory()
    });
  }

  return results;
}

/**
 * Delete a file from the workspace (Protected action)
 */
export async function deleteWorkspaceFile(relativePath: string): Promise<{ success: boolean; message: string }> {
  const safePath = resolveSafePath(relativePath);

  if (!fs.existsSync(safePath)) {
    throw new Error(`File "${relativePath}" does not exist in workspace.`);
  }

  fs.unlinkSync(safePath);
  return {
    success: true,
    message: `File "${relativePath}" successfully deleted from workspace.`
  };
}

/**
 * Verification helper: Verify a file exists and has content
 */
export function verifyWorkspaceFileExists(relativePath: string): { exists: boolean; size: number } {
  try {
    const safePath = resolveSafePath(relativePath);
    if (fs.existsSync(safePath)) {
      const stats = fs.statSync(safePath);
      return { exists: true, size: stats.size };
    }
  } catch {
    // Ignore error
  }
  return { exists: false, size: 0 };
}
