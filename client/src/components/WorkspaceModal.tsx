import React, { useState, useEffect } from 'react';
import { WorkspaceFile, api } from '../services/api.js';
import { FileText, Folder, RefreshCw, Eye, Download, HardDrive, Trash2 } from 'lucide-react';

export const WorkspaceModal: React.FC = () => {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkspaceFiles();
      setFiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handlePreview = async (filePath: string) => {
    setSelectedFile(filePath);
    setPreviewLoading(true);
    try {
      const content = await api.getFileContent(filePath);
      setFileContent(content);
    } catch (err: any) {
      setFileContent(`Error loading file: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            Approved Workspace Storage
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Isolated file directory sandboxed to <code className="text-cyan-400 font-mono">workspace/</code>. Path traversal is strictly blocked.
          </p>
        </div>
        <button
          onClick={fetchFiles}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File List */}
        <div className="space-y-2">
          {files.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
              <Folder className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium">Workspace is currently empty.</p>
              <p className="text-xs text-slate-500 mt-1">
                Tell JARVIS: "Create a file named notes.md" or "Research AI and save report to summary.txt".
              </p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.relativePath}
                onClick={() => handlePreview(file.relativePath)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedFile === file.relativePath
                    ? 'bg-slate-900/90 border-cyan-500/60 shadow-jarvis-glow'
                    : 'bg-slate-900/60 hover:bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200 font-mono">
                      {file.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(file.size / 1024).toFixed(1)} KB • {new Date(file.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Content Previewer */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sticky top-24 min-h-[400px] flex flex-col">
          {selectedFile ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-mono font-semibold text-cyan-300">
                  {selectedFile}
                </span>
                <button
                  onClick={() => handleDownload(selectedFile, fileContent)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download</span>
                </button>
              </div>

              {previewLoading ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 mr-2" />
                  Loading contents...
                </div>
              ) : (
                <textarea
                  readOnly
                  value={fileContent}
                  className="flex-1 w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs font-mono text-slate-300 outline-none resize-none leading-relaxed"
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <Eye className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs">Select any file on the left to preview its content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
