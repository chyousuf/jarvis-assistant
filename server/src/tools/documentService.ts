import { createWorkspaceFile, resolveSafePath, verifyWorkspaceFileExists } from './workspaceFiles.js';
import { logActivity } from '../db/database.js';

export interface DocumentMeta {
  title: string;
  type: 'letter' | 'report' | 'memo' | 'note';
  author: string;
  filename: string;
  format: 'markdown' | 'html';
  summary?: string;
}

/**
 * Creates formatted executive letters, technical reports, notes, and ready-to-print HTML/PDF documents.
 */
export async function createDocument(
  title: string,
  type: 'letter' | 'report' | 'memo' | 'note',
  content: string,
  targetFilename?: string
): Promise<{ success: boolean; filename: string; filePath: string; bytesWritten: number; previewHtml?: string }> {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 30);
  const ext = targetFilename?.endsWith('.html') ? '.html' : targetFilename?.endsWith('.md') ? '.md' : '.md';
  const filename = targetFilename || `${safeTitle}_${Date.now().toString(36)}${ext}`;

  let documentBody = '';

  if (ext === '.html') {
    // Professional printable document layout
    documentBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e293b; }
    h1 { font-size: 26px; border-bottom: 2px solid #00e5ff; padding-bottom: 8px; color: #0f172a; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; font-family: monospace; }
    .badge { display: inline-block; padding: 3px 8px; background: #e0f2fe; color: #0284c7; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .content { margin-top: 20px; font-size: 15px; }
    @media print { body { max-width: 100%; margin: 0; } }
  </style>
</head>
<body>
  <span class="badge">${type}</span>
  <h1>${title}</h1>
  <div class="meta">Prepared by J.A.R.V.I.S. • ${dateStr}</div>
  <div class="content">
    ${content.replace(/\n/g, '<br/>')}
  </div>
</body>
</html>`;
  } else {
    // Markdown document
    documentBody = `# ${title}\n\n**Type**: ${type.toUpperCase()}  \n**Date**: ${dateStr}  \n**Prepared by**: J.A.R.V.I.S. Autonomous Intelligence\n\n---\n\n${content}\n`;
  }

  const res = await createWorkspaceFile(filename, documentBody);
  logActivity('file', 'document_created', { filename, type, size: res.bytesWritten });

  return {
    success: true,
    filename,
    filePath: res.filePath,
    bytesWritten: res.bytesWritten
  };
}
