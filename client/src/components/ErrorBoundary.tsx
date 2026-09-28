import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 max-w-2xl mx-auto rounded-2xl bg-slate-900/95 border border-rose-500/40 text-slate-200 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 border-b border-rose-500/30 pb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-rose-200">
                {this.props.fallbackTitle || 'Component Render Interrupted'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                A non-fatal rendering error occurred. The application preserved your active session and state.
              </p>
            </div>
          </div>

          <div className="my-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto">
            <p className="font-semibold text-rose-400">Error: {this.state.error?.message || 'Unknown runtime error'}</p>
            {this.state.error?.stack && (
              <pre className="mt-2 text-[10px] text-slate-500 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
              </pre>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-jarvis-glow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recover &amp; Retry View</span>
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.hash = '';
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
