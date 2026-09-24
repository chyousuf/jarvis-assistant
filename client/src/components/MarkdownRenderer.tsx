import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Play } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}

/**
 * Format inline markdown tokens: bold, italic, code, links
 */
function renderInlineText(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Tokenizer pattern: code, link, bold, italic
  const tokenRegex = /(`[^`]+`)|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*|__([^_]+)__)|(\*([^*]+)\*|_([^_]+)_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const [fullMatch, code, link, linkText, linkUrl, bold, boldText1, boldText2, italic, italicText1, italicText2] = match;

    if (code) {
      const codeSnippet = code.slice(1, -1);
      elements.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px]"
        >
          {codeSnippet}
        </code>
      );
    } else if (link) {
      if (isSafeUrl(linkUrl)) {
        const isYouTube = linkUrl.includes('youtube.com') || linkUrl.includes('youtu.be');
        elements.push(
          <a
            key={`link-${match.index}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isYouTube
                ? "inline-flex items-center gap-1.5 px-3 py-1.5 my-1 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold shadow-sm transition-all"
                : "text-cyan-400 hover:text-cyan-300 underline font-medium inline-flex items-center gap-1 mx-0.5 break-all"
            }
          >
            {isYouTube && <Play className="w-3.5 h-3.5 fill-red-400 text-red-400 shrink-0" />}
            <span>{linkText}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        );
      } else {
        elements.push(
          <span
            key={`unsafe-link-${match.index}`}
            className="text-slate-400 font-mono text-[11px] line-through"
            title="Unsafe link URI scheme neutralized"
          >
            {linkText}
          </span>
        );
      }
    } else if (bold) {
      elements.push(
        <strong key={`bold-${match.index}`} className="font-bold text-slate-100">
          {boldText1 || boldText2}
        </strong>
      );
    } else if (italic) {
      elements.push(
        <em key={`italic-${match.index}`} className="italic text-slate-300">
          {italicText1 || italicText2}
        </em>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split lines
  const rawLines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  let currentListType: 'ul' | 'ol' | null = null;
  let currentListItems: React.ReactNode[] = [];

  const flushList = () => {
    if (currentListType && currentListItems.length > 0) {
      if (currentListType === 'ul') {
        renderedElements.push(
          <ul key={`ul-${renderedElements.length}`} className="my-2 pl-5 list-disc space-y-1 text-slate-200 text-xs">
            {currentListItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ul>
        );
      } else {
        renderedElements.push(
          <ol key={`ol-${renderedElements.length}`} className="my-2 pl-5 list-decimal space-y-1 text-slate-200 text-xs">
            {currentListItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed">{item}</li>
            ))}
          </ol>
        );
      }
      currentListType = null;
      currentListItems = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmedLine = line.trim();

    // Check for fenced code block toggle
    if (trimmedLine.startsWith('```')) {
      flushList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = trimmedLine.slice(3).trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        renderedElements.push(
          <CodeBlock
            key={`cb-${renderedElements.length}`}
            code={codeBlockLines.join('\n')}
            language={codeBlockLang}
          />
        );
        codeBlockLang = '';
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Headings
    if (trimmedLine.startsWith('### ')) {
      flushList();
      renderedElements.push(
        <h4 key={`h4-${renderedElements.length}`} className="text-xs font-bold font-mono text-cyan-300 mt-2.5 mb-1 tracking-wide uppercase">
          {renderInlineText(trimmedLine.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmedLine.startsWith('## ')) {
      flushList();
      renderedElements.push(
        <h3 key={`h3-${renderedElements.length}`} className="text-sm font-bold font-mono text-slate-100 mt-3 mb-1">
          {renderInlineText(trimmedLine.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmedLine.startsWith('# ')) {
      flushList();
      renderedElements.push(
        <h2 key={`h2-${renderedElements.length}`} className="text-base font-bold font-mono text-slate-100 mt-3.5 mb-1.5">
          {renderInlineText(trimmedLine.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquotes
    if (trimmedLine.startsWith('> ')) {
      flushList();
      renderedElements.push(
        <blockquote
          key={`bq-${renderedElements.length}`}
          className="border-l-2 border-cyan-500/60 pl-3 py-1 my-1.5 italic text-slate-300 bg-slate-950/40 rounded-r text-xs leading-relaxed"
        >
          {renderInlineText(trimmedLine.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered lists (- or *)
    const ulMatch = line.match(/^(\s*)(?:-|\*)\s+(.+)$/);
    if (ulMatch) {
      if (currentListType !== 'ul') {
        flushList();
        currentListType = 'ul';
      }
      currentListItems.push(renderInlineText(ulMatch[2]));
      continue;
    }

    // Ordered lists (1., 2.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
      }
      currentListItems.push(renderInlineText(olMatch[2]));
      continue;
    }

    // Regular line / Paragraph
    flushList();

    if (trimmedLine === '') {
      // Small vertical spacer
      renderedElements.push(<div key={`sp-${renderedElements.length}`} className="h-1.5" />);
    } else {
      renderedElements.push(
        <p key={`p-${renderedElements.length}`} className="my-0.5 leading-relaxed">
          {renderInlineText(line)}
        </p>
      );
    }
  }

  flushList();

  // Handle unclosed code block safely
  if (inCodeBlock && codeBlockLines.length > 0) {
    renderedElements.push(
      <CodeBlock
        key={`cb-${renderedElements.length}`}
        code={codeBlockLines.join('\n')}
        language={codeBlockLang}
      />
    );
  }

  return <div className={`markdown-content space-y-0.5 ${className}`}>{renderedElements}</div>;
};
