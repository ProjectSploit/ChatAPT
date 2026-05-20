import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const LANG_TO_EXT: Record<string, string> = {
  python: "py", py: "py",
  javascript: "js", js: "js",
  typescript: "ts", ts: "ts",
  tsx: "tsx", jsx: "jsx",
  html: "html", css: "css", scss: "scss",
  java: "java", c: "c", cpp: "cpp", "c++": "cpp",
  rust: "rs", go: "go", ruby: "rb",
  php: "php", swift: "swift", kotlin: "kt",
  shell: "sh", bash: "sh", sh: "sh", zsh: "sh",
  sql: "sql", json: "json", yaml: "yml", yml: "yml",
  markdown: "md", md: "md", xml: "xml", toml: "toml",
  r: "r", matlab: "m", dart: "dart", lua: "lua",
};

function extractFilenameFromCode(code: string, language: string): string {
  const firstLine = code.split("\n")[0]?.trim() ?? "";
  const patterns = [
    /^#\s*(?:filename|file):\s*(.+)$/i,
    /^\/\/\s*(?:filename|file):\s*(.+)$/i,
    /^\/\*\s*(?:filename|file):\s*(.+?)\s*\*\//i,
    /^<!--\s*(?:filename|file):\s*(.+?)\s*-->/i,
    /^--\s*(?:filename|file):\s*(.+)$/i,
  ];
  for (const pat of patterns) {
    const m = pat.exec(firstLine);
    if (m?.[1]) return m[1].trim();
  }
  const ext = LANG_TO_EXT[language?.toLowerCase()] ?? (language || "txt");
  return `ChatAPT_${Date.now()}.${ext}`;
}

function downloadCode(code: string, filename: string) {
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CodeBlockHeader({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const filename = extractFilenameFromCode(code, language);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-between bg-[#1a1a1a] px-4 py-2 border-b border-[#2a2a2a]">
      <span className="text-[11px] text-[#666] font-mono">{language || "code"}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => downloadCode(code, filename)}
          title={`Download as ${filename}`}
          className="text-[11px] text-[#888] hover:text-white transition-colors px-2 py-0.5 rounded border border-[#333] hover:border-[#555] flex items-center gap-1"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="max-w-[140px] truncate">{filename}</span>
        </button>
        <button
          onClick={handleCopy}
          className="text-[11px] text-[#888] hover:text-white transition-colors px-2 py-0.5 rounded border border-[#333] hover:border-[#555]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

interface Props {
  content: string;
}

export default function MarkdownMessage({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeStr = String(children).replace(/\n$/, "");
          const isBlock = codeStr.includes("\n") || !!match;

          if (isBlock) {
            const lang = match ? match[1] : "";
            return (
              <div className="my-3 rounded-xl overflow-hidden border border-[#2a2a2a]">
                <CodeBlockHeader language={lang} code={codeStr} />
                <SyntaxHighlighter
                  style={oneDark}
                  language={lang || "text"}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: 0, background: "#111", fontSize: "13px", padding: "16px" }}
                  codeTagProps={{ style: { fontFamily: "monospace" } }}
                >
                  {codeStr}
                </SyntaxHighlighter>
              </div>
            );
          }
          return (
            <code className="bg-[#1e1e1e] text-[#e06c75] px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-[#e0e0e0]">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#444] pl-4 text-[#999] italic my-3">{children}</blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#7aa2f7] underline underline-offset-2 hover:text-[#a9c1ff]">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-[#ccc]">{children}</em>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-[#2a2a2a]">
            <table className="w-full text-[13px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[#1a1a1a] text-[#ccc]">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-[#222]">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-[#161616] transition-colors">{children}</tr>,
        th: ({ children }) => <th className="px-4 py-2 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2 text-[#bbb]">{children}</td>,
        hr: () => <hr className="border-[#2a2a2a] my-4" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
