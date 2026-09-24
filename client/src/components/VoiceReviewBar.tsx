import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, X, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

interface VoiceReviewBarProps {
  transcript: string;
  confidence?: number;
  isCorrection?: boolean;
  onExecute: (text: string) => void;
  onTryAgain: () => void;
  onCancel: () => void;
}

export const VoiceReviewBar: React.FC<VoiceReviewBarProps> = ({
  transcript,
  confidence,
  isCorrection,
  onExecute,
  onTryAgain,
  onCancel
}) => {
  const [editedText, setEditedText] = useState(transcript);

  useEffect(() => {
    setEditedText(transcript);
  }, [transcript]);

  if (!transcript) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editedText.trim()) {
        onExecute(editedText.trim());
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-slideUp">
      <div className="bg-[#0b1220]/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl shadow-2xl p-4 space-y-3">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-cyan-300 font-bold">
              {isCorrection ? 'Voice Correction' : 'Voice Message'}
            </span>
            {confidence && (
              <span className="text-slate-400 text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                Confidence: {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          <span className="text-slate-500 text-[11px]">
            Review &amp; Edit (Press Enter to Send)
          </span>
        </div>

        {/* Editable Transcript Input */}
        <div className="relative">
          <input
            type="text"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-cyan-500/30 rounded-xl text-sm font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
            placeholder="Edit recognized command here..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] font-mono text-slate-400">
            Esc to cancel • Enter to Send
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-all flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={onTryAgain}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 text-xs font-mono transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              onClick={() => editedText.trim() && onExecute(editedText.trim())}
              disabled={!editedText.trim()}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
