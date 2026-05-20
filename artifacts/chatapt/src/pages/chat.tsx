import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  useListConversations,
  useCreateConversation,
  useGetConversation,
  useDeleteConversation,
  getListConversationsQueryKey,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  HamburgerIcon, CirclePlusIcon, CircleXIcon,
  ThinkIcon, SearchIcon, QwenLogoInline,
  CameraIcon, PhotoIcon, DocumentIcon,
} from "@/components/icons";
import MarkdownMessage from "@/components/MarkdownMessage";
import SettingsPanel, { getActiveSystemPrompt } from "@/components/SettingsPanel";
import DataControlsPanel from "@/components/DataControlsPanel";
import ModelSettingsPanel from "@/components/ModelSettingsPanel";
import { addMemory, getAllMemories, getAllDocuments, getAllAINotes, setAINote, deleteAINote } from "@/lib/memory";
import { getModelSettings } from "@/lib/modelSettings";

// ─── Types ────────────────────────────────────────────────────────────────────

type Source = { title: string; link: string; snippet: string };

type LocalMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachment?: { name: string; type: string; preview?: string };
  thinking?: string;
  sources?: Source[];
  isContinue?: boolean;
};

type SelectedFile = {
  file: File;
  name: string;
  type: string;
  preview?: string;
  textContent?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const THINK_ON_LABEL  = "The AI engages in a visible reasoning process before delivering its final answer. It first interprets the problem, breaks it into key components, and identifies relevant factors and dependencies. It then evaluates multiple possible approaches, compares trade-offs, and checks for logical consistency and potential edge cases. The final output prioritizes correctness, clarity, and robustness over speed.";
const THINK_OFF_LABEL = "The AI responds quickly using direct and concise reasoning. It prioritizes clear answers over deep analysis, using general knowledge and minimal processing to deliver fast, useful responses. This mode is optimized for speed and simplicity rather than exhaustive evaluation.";
const SEARCH_ON_LABEL  = "The AI can access external, real-time information sources when needed to retrieve up-to-date data, verify facts, and supplement built-in knowledge. If a search is not necessary, it responds using existing knowledge alone.";
const SEARCH_OFF_LABEL = "The AI does not access the internet. It responds using its built-in knowledge and any locally stored data such as saved documents, notes, and approved memory. This mode prioritizes speed, privacy, and offline functionality.";

const EXT_LANG: Record<string, string> = {
  py:"python", js:"javascript", ts:"typescript", tsx:"tsx", jsx:"jsx",
  html:"html", css:"css", scss:"scss", json:"json", yaml:"yaml", yml:"yaml",
  md:"markdown", sh:"bash", bash:"bash", java:"java", c:"c", cpp:"cpp",
  rs:"rust", go:"go", rb:"ruby", php:"php", swift:"swift", kt:"kotlin",
  sql:"sql", xml:"xml", toml:"toml", r:"r", lua:"lua",
};

function isTextReadable(file: File): boolean {
  const textExts = [...Object.keys(EXT_LANG), "txt", "csv", "env", "ini", "conf", "log"];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type.startsWith("text/") ||
    ["application/json","application/yaml","application/xml"].some(m => file.type.includes(m)) ||
    textExts.includes(ext);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function ContinueIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="15 10 20 15 15 20" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </svg>
  );
}

// ─── ThinkingSection ─────────────────────────────────────────────────────────

const ThinkingSection = memo(function ThinkingSection({
  thinking, streaming, isLive,
}: {
  thinking: string;
  streaming?: boolean;
  isLive?: boolean;
}) {
  // Live (currently streaming) → start open, auto-collapse when done
  // Historical (from DB) → start collapsed, user can expand
  const [open, setOpen] = useState(isLive ?? false);

  useEffect(() => {
    if (isLive && !streaming) {
      const t = setTimeout(() => setOpen(false), 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [streaming, isLive]);

  const bullets = thinking.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[#555] text-[13px] mb-3 hover:text-[#999] transition-colors group"
      >
        {streaming && (
          <span className="flex gap-[3px] items-center">
            <span className="think-dot w-[5px] h-[5px] bg-[#555] rounded-full" style={{ animationDelay: "0ms" }} />
            <span className="think-dot w-[5px] h-[5px] bg-[#555] rounded-full" style={{ animationDelay: "200ms" }} />
            <span className="think-dot w-[5px] h-[5px] bg-[#555] rounded-full" style={{ animationDelay: "400ms" }} />
          </span>
        )}
        <span className="font-medium">{streaming ? "Thinking" : open ? "Thought process" : "Thought for a moment"}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="pl-4 border-l-2 border-[#222] space-y-3">
          {bullets.length > 0 ? bullets.map((b, i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-[8px] w-[4px] h-[4px] rounded-full bg-[#333] shrink-0" />
              <p className="text-[#4a4a4a] text-[13px] leading-[1.7]">{b}</p>
            </div>
          )) : (
            <div className="flex gap-3">
              <span className="mt-[8px] w-[4px] h-[4px] rounded-full bg-[#2a2a2a] shrink-0" />
              <p className="text-[#3a3a3a] text-[13px] italic">Reasoning…</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ─── SourcesSection ───────────────────────────────────────────────────────────

const SourcesSection = memo(function SourcesSection({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-[#1c1c1c] overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#111] text-[#666] text-[13px] hover:text-[#999] transition-colors">
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Read {sources.length} web page{sources.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="bg-[#0a0a0a] divide-y divide-[#141414]">
          {sources.map((s, i) => (
            <a key={i} href={s.link} target="_blank" rel="noopener noreferrer"
              className="flex flex-col px-4 py-3.5 hover:bg-[#111] transition-colors">
              <span className="text-[#7aa2f7] text-[13px] font-medium truncate">{s.title}</span>
              <span className="text-[#333] text-[11px] truncate mt-0.5">{s.link}</span>
              <span className="text-[#555] text-[12px] mt-1.5 line-clamp-2 leading-relaxed">{s.snippet}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── ToggleDescription ────────────────────────────────────────────────────────

function ToggleDescription({ text }: { text: string }) {
  return (
    <div className="mx-3 mb-2 px-4 py-3.5 bg-[#0f0f0f] rounded-2xl border border-[#1c1c1c] msg-in">
      <p className="text-[#666] text-[12px] leading-[1.7]">{text}</p>
    </div>
  );
}

// ─── Message action icons ──────────────────────────────────────────────────────

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v13m0 0-4-4m4 4 4-4" />
      <path d="M3 18h18v3H3z" />
    </svg>
  );
}
function RegenerateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function downloadMessage(content: string, id: number) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `response-${id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

const MessageBubble = memo(function MessageBubble({
  msg, isActiveStream, isStoppedLast, isLast, onContinue, onRegenerate,
}: {
  msg: LocalMessage;
  isActiveStream: boolean;
  isStoppedLast?: boolean;
  isLast?: boolean;
  onContinue?: () => void;
  onRegenerate?: () => void;
}) {
  // User bubble
  if (msg.role === "user") {
    if (msg.isContinue) {
      return (
        <div className="flex justify-center">
          <span className="text-[#2a2a2a] text-[11px] tracking-wide">↩ continued</span>
        </div>
      );
    }
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[84%] flex flex-col gap-2.5 items-end">
          {msg.attachment && (
            <div className="rounded-2xl overflow-hidden bg-[#1a1a1a]">
              {msg.attachment.preview
                ? <img src={msg.attachment.preview} alt={msg.attachment.name}
                    className="max-w-[240px] max-h-[200px] object-cover" />
                : (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <DocumentIcon className="w-5 h-5 text-[#666] shrink-0" />
                    <span className="text-[#ccc] text-[13px] truncate max-w-[180px]">{msg.attachment.name}</span>
                  </div>
                )
              }
            </div>
          )}
          {msg.content && (
            <div className="bg-[#1e1e1e] text-white text-[16px] px-4 py-3 rounded-[20px] leading-[1.65]">
              {msg.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant bubble
  const isThinkingOnly = !!msg.thinking && !msg.content && isActiveStream;

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[94%] text-[#d4d4d4] text-[16px] w-full">
        {msg.thinking && (
          <ThinkingSection
            thinking={msg.thinking}
            streaming={isThinkingOnly}
            isLive={isActiveStream}
          />
        )}
        {msg.content
          ? <MarkdownMessage content={msg.content} />
          : !msg.thinking && (
            <span className="flex gap-1.5 items-center h-7">
              <span className="think-dot w-[7px] h-[7px] bg-[#2e2e2e] rounded-full" style={{ animationDelay: "0ms" }} />
              <span className="think-dot w-[7px] h-[7px] bg-[#2e2e2e] rounded-full" style={{ animationDelay: "200ms" }} />
              <span className="think-dot w-[7px] h-[7px] bg-[#2e2e2e] rounded-full" style={{ animationDelay: "400ms" }} />
            </span>
          )
        }
        {msg.sources && msg.sources.length > 0 && <SourcesSection sources={msg.sources} />}

        {/* Continue button — appears only on the last AI message after stopping */}
        {isStoppedLast && (
          <div className="mt-4">
            <button
              onClick={onContinue}
              className="continue-btn flex items-center gap-2 text-[12px] text-[#555] hover:text-[#aaa] bg-[#141414] border border-[#242424] hover:border-[#353535] rounded-full px-3.5 py-2 transition-all active:scale-95"
            >
              <ContinueIcon className="w-3.5 h-3.5" />
              Continue response
            </button>
          </div>
        )}

        {/* Action icons — copy, download, regenerate */}
        {!isActiveStream && msg.content && (
          <MessageActions
            content={msg.content}
            msgId={msg.id}
            isLast={!!isLast}
            onRegenerate={onRegenerate}
          />
        )}
      </div>
    </div>
  );
});

// ─── MessageActions ───────────────────────────────────────────────────────────

const MessageActions = memo(function MessageActions({
  content, msgId, isLast, onRegenerate,
}: {
  content: string;
  msgId: number;
  isLast: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [content]);

  return (
    <div className="flex items-center gap-4 mt-3 ml-0.5">
      <button
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy"}
        className="text-[#444] hover:text-[#888] transition-colors active:scale-90"
      >
        {copied
          ? <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          : <CopyIcon className="w-[18px] h-[18px]" />
        }
      </button>
      <button
        onClick={() => downloadMessage(content, msgId)}
        title="Download"
        className="text-[#444] hover:text-[#888] transition-colors active:scale-90"
      >
        <DownloadIcon className="w-[18px] h-[18px]" />
      </button>
      {isLast && onRegenerate && (
        <button
          onClick={onRegenerate}
          title="Regenerate"
          className="text-[#444] hover:text-[#888] transition-colors active:scale-90"
        >
          <RegenerateIcon className="w-[18px] h-[18px]" />
        </button>
      )}
    </div>
  );
});

// ─── MessagesList ─────────────────────────────────────────────────────────────

const MessagesList = memo(function MessagesList({
  messages, isStreaming, isStopped, onContinue, onRegenerate, endRef, newFromIdx,
}: {
  messages: LocalMessage[];
  isStreaming: boolean;
  isStopped: boolean;
  onContinue: () => void;
  onRegenerate: () => void;
  endRef: React.RefObject<HTMLDivElement | null>;
  newFromIdx: number;
}) {
  return (
    <div className="flex flex-col gap-8 pt-4 pb-10">
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1;
        const isActiveStream = isStreaming && isLast && msg.role === "assistant";
        const isStoppedLast  = isStopped  && isLast && msg.role === "assistant";
        return (
          <div key={msg.id} className={idx >= newFromIdx ? "msg-in" : undefined}>
            <MessageBubble
              msg={msg}
              isActiveStream={isActiveStream}
              isStoppedLast={isStoppedLast}
              isLast={isLast}
              onContinue={onContinue}
              onRegenerate={onRegenerate}
            />
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────

type SidePanel = "menu" | "settings" | "data" | "model" | null;

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isThinkActive, setIsThinkActive]   = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [activeDescription, setActiveDescription] = useState<"think" | "search" | null>(null);
  const [toast, setToast]       = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [streamingMessages, setStreamingMessages] = useState<LocalMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStopped, setIsStopped]   = useState(false);
  const [activeConvTitle, setActiveConvTitle] = useState("New Chat");
  const [contextConvId, setContextConvId] = useState<number | null>(null);
  const [renamingId, setRenamingId]       = useState<number | null>(null);
  const [renameValue, setRenameValue]     = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newFromIdx, setNewFromIdx]       = useState(Infinity);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef        = useRef<HTMLDivElement>(null);
  const autoScrollRef         = useRef(true);
  const lastScrollTopRef      = useRef(0);
  const isProgrammaticRef     = useRef(false);
  const abortRef              = useRef<AbortController | null>(null);
  const activeIdRef           = useRef<number | null>(null);
  const longPressTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef        = useRef<HTMLInputElement>(null);
  const photoInputRef         = useRef<HTMLInputElement>(null);
  const documentInputRef      = useRef<HTMLInputElement>(null);

  // rAF batching — accumulate content between frames, flush at most 60fps
  const pendingContentRef  = useRef("");
  const pendingThinkingRef = useRef("");
  const rafRef             = useRef<number | null>(null);

  // Prevents the activeConversation useEffect from wiping streamingMessages during a send
  const streamLockRef = useRef(false);
  // Tracks whether streamingMessages currently has content (via ref to avoid stale closure)
  const hasStreamingContentRef = useRef(false);

  const { data: conversations = [] } = useListConversations();
  const { data: activeConversation } = useGetConversation(activeId!, {
    query: { enabled: !!activeId, queryKey: getGetConversationQueryKey(activeId!) },
  });

  // Keep activeIdRef in sync
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Keep hasStreamingContentRef in sync so the load effect can read it without a dep
  useEffect(() => { hasStreamingContentRef.current = streamingMessages.length > 0; }, [streamingMessages]);

  // Load conversation messages — only when NOT streaming AND not mid-send.
  // Critical guard: never overwrite existing streaming content with an empty DB
  // response (happens when the cache hasn't refreshed yet after a new conversation).
  useEffect(() => {
    if (activeConversation && !isStreaming && !streamLockRef.current) {
      const dbMsgs = (activeConversation.messages || []);
      // If the DB returned 0 messages but we already have streaming content,
      // the cache is stale — skip this update to prevent the empty-state flash.
      if (dbMsgs.length === 0 && hasStreamingContentRef.current) return;
      setStreamingMessages(dbMsgs.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt as string,
        thinking: (m as any).thinking || undefined,
      })));
      setActiveConvTitle(activeConversation.title || "New Chat");
      setIsStopped(false);
    }
  }, [activeConversation, isStreaming]);

  // ── MutationObserver scroll ────────────────────────────────────────────────────
  // autoScrollRef starts true. The moment the user physically scrolls UP it flips
  // false and stays false until a new message is sent (handleSend resets it).
  // Scrolling back all the way to the bottom re-enables it.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const observer = new MutationObserver(() => {
      if (!autoScrollRef.current) return;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!autoScrollRef.current) return;
        isProgrammaticRef.current = true;
        container.scrollTop = container.scrollHeight;
        requestAnimationFrame(() => { isProgrammaticRef.current = false; });
      });
    });

    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Scroll handler — direction-based: up = lock auto-scroll, back at bottom = re-enable
  const handleContainerScroll = useCallback(() => {
    if (isProgrammaticRef.current) return;
    const el = messagesContainerRef.current;
    if (!el) return;

    const newTop = el.scrollTop;
    const prev   = lastScrollTopRef.current;
    lastScrollTopRef.current = newTop;

    const dist    = el.scrollHeight - newTop - el.clientHeight;
    const atBottom = dist < 60;

    if (newTop < prev - 2) {
      // User scrolled up — immediately stop following output
      autoScrollRef.current = false;
      setShowScrollBtn(true);
    } else if (atBottom) {
      // User scrolled back to bottom — re-enable following
      autoScrollRef.current = true;
      setShowScrollBtn(false);
    }
  }, []);

  // Force-scroll to bottom (used on send + scroll button)
  const scrollToBottomForce = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    isProgrammaticRef.current = true;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    requestAnimationFrame(() => { isProgrammaticRef.current = false; });
    autoScrollRef.current = true;
    setShowScrollBtn(false);
  }, []);

  const createConversation   = useCreateConversation();
  const deleteConversation   = useDeleteConversation();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────────

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAttachOpen(false);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setSelectedFile({ file, name: file.name, type: file.type, preview: ev.target?.result as string });
      reader.readAsDataURL(file);
    } else if (isTextReadable(file)) {
      const reader = new FileReader();
      reader.onload = ev => setSelectedFile({ file, name: file.name, type: file.type, textContent: ev.target?.result as string });
      reader.readAsText(file);
    } else {
      setSelectedFile({ file, name: file.name, type: file.type });
    }
    e.target.value = "";
  };

  // ── System prompt builder ─────────────────────────────────────────────────────

  const buildSystemPrompt = useCallback(async (): Promise<string> => {
    const base = getActiveSystemPrompt();
    const parts: string[] = [base];
    try {
      const mems = await getAllMemories();
      if (mems.length > 0)
        parts.push("\n\n[Long-term Memory — facts from past conversations]\n" +
          mems.slice(0, 20).map(m => `• ${m.content}`).join("\n"));
    } catch { /* non-fatal */ }
    try {
      const docs = await getAllDocuments();
      if (docs.length > 0)
        parts.push("\n\n[Local Knowledge Base]\n" +
          docs.slice(0, 5).map(d => `--- ${d.name} ---\n${d.content.slice(0, 2000)}`).join("\n\n"));
    } catch { /* non-fatal */ }
    try {
      const notes = await getAllAINotes();
      if (notes.length > 0)
        parts.push("\n\n[Your Private Notes — only you can see these]\n" +
          notes.map(n => `${n.key}: ${n.content}`).join("\n"));
    } catch { /* non-fatal */ }
    return parts.join("");
  }, []);

  // ── rAF batch flush — merges accumulated content/thinking into state once per frame ──

  const flushStreamPending = useCallback(() => {
    const c = pendingContentRef.current;
    const t = pendingThinkingRef.current;
    pendingContentRef.current  = "";
    pendingThinkingRef.current = "";
    rafRef.current = null;
    if (!c && !t) return;
    setStreamingMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role !== "assistant") return prev;
      return [
        ...next.slice(0, -1),
        {
          ...last,
          content: c ? last.content + c : last.content,
          thinking: t ? (last.thinking ?? "") + t : last.thinking,
        },
      ];
    });
  }, []);

  // ── Core stream runner ────────────────────────────────────────────────────────

  const runStream = useCallback(async (params: {
    convId: number;
    content: string;
    isContinueMode?: boolean;
    imageBase64?: string;
    imageMimeType?: string;
    fileContent?: string;
    fileName?: string;
    systemPrompt: string;
    thinkingMode: boolean;
    searchMode: boolean;
    standardModelId?: string;
    thinkModelId?: string;
    visionModelId?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    thinkTemperature?: number;
    thinkMaxTokens?: number;
    thinkTopP?: number;
    visionTemperature?: number;
    visionMaxTokens?: number;
    visionTopP?: number;
  }) => {
    const controller = new AbortController();
    abortRef.current = controller;

    // ── Background keep-alive via Web Locks ──────────────────────────────────
    const doFetch = async () => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/openai/conversations/${params.convId}/messages`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: params.content,
            thinkingMode: params.thinkingMode,
            searchMode: params.searchMode,
            systemPrompt: params.systemPrompt,
            imageBase64: params.imageBase64,
            imageMimeType: params.imageMimeType,
            fileContent: params.fileContent,
            fileName: params.fileName,
            isContinueMode: params.isContinueMode ?? false,
            standardModelId: params.standardModelId,
            thinkModelId:    params.thinkModelId,
            visionModelId:   params.visionModelId,
            temperature: params.temperature,
            maxTokens:   params.maxTokens,
            topP:        params.topP,
            thinkTemperature: params.thinkTemperature,
            thinkMaxTokens:   params.thinkMaxTokens,
            thinkTopP:        params.thinkTopP,
            visionTemperature: params.visionTemperature,
            visionMaxTokens:   params.visionMaxTokens,
            visionTopP:        params.visionTopP,
          }),
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.done) {
              // Flush any remaining accumulated content immediately
              if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
              flushStreamPending();
              const id = activeIdRef.current ?? params.convId;
              // Only invalidate the sidebar list immediately; delay conversation detail
              // refetch so the heavy markdown re-render doesn't freeze the input
              queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(id) });
              }, 1800);
            } else if (data.titleUpdate) {
              setActiveConvTitle(data.titleUpdate);
              queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
            } else if (data.memory) {
              addMemory(data.memory, params.convId, activeConvTitle || "Conversation").catch(() => {});
            } else if (data.noteOp) {
              const op = data.noteOp as { action: "set" | "del"; key: string; value?: string };
              if (op.action === "set" && op.key && op.value != null)
                setAINote(op.key, op.value.replace(/\\n/g, "\n")).catch(() => {});
              else if (op.action === "del" && op.key)
                deleteAINote(op.key).catch(() => {});
            } else if (data.error) {
              const short = (data.error as string).slice(0, 120);
              showToast(`Error: ${short}`);
            } else if (data.fallback) {
              showToast(data.fallback);
            } else if (data.sources) {
              // Flush pending before applying sources so ordering is correct
              if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
              flushStreamPending();
              setStreamingMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") next[next.length - 1] = { ...last, sources: data.sources };
                return next;
              });
            } else if (data.thinking) {
              // Accumulate thinking in ref; schedule a rAF flush
              pendingThinkingRef.current += data.thinking as string;
              if (rafRef.current === null)
                rafRef.current = requestAnimationFrame(() => flushStreamPending());
            } else if (data.content) {
              // Accumulate content in ref; schedule a rAF flush (max 60fps re-renders)
              pendingContentRef.current += data.content as string;
              if (rafRef.current === null)
                rafRef.current = requestAnimationFrame(() => flushStreamPending());
            }
          } catch { /* incomplete chunk */ }
        }
      }
      // Final flush for anything left in the buffer
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      flushStreamPending();
    };

    // Use Web Lock to keep running even when tab is backgrounded
    if ("locks" in navigator) {
      await navigator.locks.request("chatapt-stream", { mode: "exclusive" }, doFetch);
    } else {
      await doFetch();
    }
  }, [queryClient, activeConvTitle, showToast, flushStreamPending]);

  // ── Stop ──────────────────────────────────────────────────────────────────────

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setIsStopped(true);
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (opts?: { isContinue?: boolean; regenerateContent?: string }) => {
    const isContinue = opts?.isContinue ?? false;
    const isRegenerate = opts?.regenerateContent !== undefined;
    const trimmed = isRegenerate ? opts!.regenerateContent! : message.trim();
    if (!trimmed && !selectedFile && !isContinue) return;
    if (isStreaming) return;

    // Lock IMMEDIATELY (synchronous, before any await) so the activeConversation
    // useEffect cannot wipe streamingMessages while we're setting up the send
    streamLockRef.current = true;

    setIsAttachOpen(false);
    setActiveDescription(null);
    setIsStopped(false);

    let contentToSend = trimmed;
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    let fileContent: string | undefined;
    let fileName: string | undefined;

    if (!isContinue && selectedFile) {
      if (selectedFile.preview && selectedFile.type.startsWith("image/")) {
        imageBase64   = selectedFile.preview.split(",")[1];
        imageMimeType = selectedFile.type;
        if (!contentToSend) contentToSend = "Please analyze this image.";
      } else if (selectedFile.textContent !== undefined) {
        // Pass file content separately — never paste into the visible message
        fileContent = selectedFile.textContent;
        fileName    = selectedFile.name;
      } else {
        if (!contentToSend) contentToSend = `[Attached: ${selectedFile.name}]`;
      }
    }

    const systemPrompt = await buildSystemPrompt();

    // Ensure conversation exists
    let convId = activeId;
    if (!convId) {
      const newConv = await new Promise<{ id: number; title: string }>((resolve, reject) => {
        createConversation.mutate(
          { data: { title: "New Chat" } },
          {
            onSuccess: c => {
              queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
              setActiveId(c.id);
              resolve(c);
            },
            onError: reject,
          }
        );
      });
      convId = newConv.id;
    }

    if (isContinue) {
      setStreamingMessages(prev => {
        setNewFromIdx(prev.length); // animate only the two new items
        const continueMarker: LocalMessage = {
          id: Date.now(), role: "user", content: "", createdAt: new Date().toISOString(), isContinue: true,
        };
        const assistantMsg: LocalMessage = {
          id: Date.now() + 1, role: "assistant", content: "", createdAt: new Date().toISOString(),
        };
        return [...prev, continueMarker, assistantMsg];
      });
    } else {
      const attachmentInfo = selectedFile
        ? { name: selectedFile.name, type: selectedFile.type, preview: selectedFile.preview }
        : undefined;
      const userMsg: LocalMessage = {
        id: Date.now(), role: "user",
        content: trimmed || (selectedFile ? `[File: ${selectedFile.name}]` : ""),
        createdAt: new Date().toISOString(), attachment: attachmentInfo,
      };
      const assistantMsg: LocalMessage = {
        id: Date.now() + 1, role: "assistant", content: "", createdAt: new Date().toISOString(),
      };
      setStreamingMessages(prev => {
        setNewFromIdx(prev.length); // animate only the two new items
        return [...prev, userMsg, assistantMsg];
      });
      setMessage("");
      setSelectedFile(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }

    autoScrollRef.current = true;
    setShowScrollBtn(false);
    setIsStreaming(true);
    setTimeout(scrollToBottomForce, 50);

    const ms = getModelSettings();

    try {
      await runStream({
        convId,
        content: isContinue ? "" : contentToSend,
        isContinueMode: isContinue,
        imageBase64,
        imageMimeType,
        fileContent,
        fileName,
        systemPrompt,
        thinkingMode: isThinkActive,
        searchMode: isSearchActive,
        standardModelId: ms.standardModelId,
        thinkModelId:    ms.thinkModelId,
        visionModelId:   ms.visionModelId,
        temperature: ms.standard.temperature,
        maxTokens:   ms.standard.maxTokens,
        topP:        ms.standard.topP,
        thinkTemperature: ms.think.temperature,
        thinkMaxTokens:   ms.think.maxTokens,
        thinkTopP:        ms.think.topP,
        visionTemperature: ms.vision.temperature,
        visionMaxTokens:   ms.vision.maxTokens,
        visionTopP:        ms.vision.topP,
      });
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Stream error", err);
        showToast("Connection error — please try again.");
      }
    } finally {
      streamLockRef.current = false;
      setIsStreaming(false);
    }
  }, [
    message, selectedFile, isStreaming, activeId, isThinkActive, isSearchActive,
    buildSystemPrompt, createConversation, queryClient, runStream, scrollToBottomForce, showToast,
  ]);

  // Continue handler
  const handleContinue = useCallback(() => {
    handleSend({ isContinue: true });
  }, [handleSend]);

  const handleRegenerate = useCallback(async () => {
    if (isStreaming || !activeId) return;

    // Find the last user message content before the assistant reply
    const lastUserMsg = [...streamingMessages].reverse().find(m => m.role === "user" && !m.isContinue);
    if (!lastUserMsg?.content) return;

    // Delete the last exchange (user + assistant) from the DB so the AI starts fresh
    await fetch(`${import.meta.env.BASE_URL}api/openai/conversations/${activeId}/last-exchange`, {
      method: "DELETE",
    });

    // Strip both the last assistant message and last user message from local state
    setStreamingMessages(prev => {
      let arr = [...prev];
      if (arr[arr.length - 1]?.role === "assistant") arr = arr.slice(0, -1);
      if (arr[arr.length - 1]?.role === "user")      arr = arr.slice(0, -1);
      return arr;
    });

    // Re-send the same user message as a fresh request
    handleSend({ regenerateContent: lastUserMsg.content });
  }, [isStreaming, activeId, streamingMessages, handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  // ── Conversation management ───────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    setSidePanel(null);
    createConversation.mutate(
      { data: { title: "New Chat" } },
      {
        onSuccess: c => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setActiveId(c.id);
          setStreamingMessages([]);
          setMessage("");
          setSelectedFile(null);
          setActiveConvTitle("New Chat");
          setIsStopped(false);
        },
      }
    );
  }, [createConversation, queryClient]);

  const handleDelete = (id: number) => {
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          if (activeId === id) { setActiveId(null); setStreamingMessages([]); setIsStopped(false); }
          setContextConvId(null);
        },
      }
    );
  };

  const handleRenameConfirm = async () => {
    if (!renamingId || !renameValue.trim()) return;
    await fetch(`${import.meta.env.BASE_URL}api/openai/conversations/${renamingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    if (activeId === renamingId) setActiveConvTitle(renameValue.trim());
    setRenamingId(null);
    setContextConvId(null);
  };

  const startLongPress = (id: number) => {
    longPressTimerRef.current = setTimeout(() => {
      const conv = conversations.find(c => c.id === id);
      setRenameValue(conv?.title ?? "");
      setRenamingId(null);
      setContextConvId(id);
    }, 480);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const selectConversation = (id: number) => { setActiveId(id); setSidePanel(null); setIsStopped(false); setNewFromIdx(Infinity); };
  const toggleThink  = () => { setIsThinkActive(p => !p);  setActiveDescription(p => p === "think"  ? null : "think"); };
  const toggleSearch = () => { setIsSearchActive(p => !p); setActiveDescription(p => p === "search" ? null : "search"); };

  const hasMessages = streamingMessages.length > 0;
  const canSend = (message.trim().length > 0 || !!selectedFile) && !isStreaming;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative flex h-screen w-full max-w-[480px] mx-auto flex-col overflow-hidden bg-[#080808]"
      onClick={() => { if (isAttachOpen) setIsAttachOpen(false); if (activeDescription) setActiveDescription(null); }}
    >
      {/* Hidden file inputs */}
      <input ref={cameraInputRef}   type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelected} />
      <input ref={photoInputRef}    type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelected} />
      <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.yaml,.env,.py,.js,.ts,.tsx,.jsx,.html,.css,.java,.c,.cpp,.rs,.go,.rb,.php,.swift,.kt" className="hidden" onChange={handleFileSelected} />

      {/* No bottom sheet — actions are inline on each row */}

      {/* Side drawer */}
      {sidePanel && (
        <div className="absolute inset-0 z-40 flex fade-in" onClick={() => setSidePanel(null)}>
          <div className="w-[300px] h-full bg-[#0d0d0d] flex flex-col shadow-2xl border-r border-[#191919] sidebar-in"
            onClick={e => e.stopPropagation()}>
            {sidePanel === "menu" && (
              <>
                <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-[#191919]">
                  <span className="text-white font-semibold text-[15px] tracking-tight">ChatAPT</span>
                  <button onClick={() => setSidePanel(null)} className="text-[#555] hover:text-white transition-colors">
                    <CircleXIcon className="w-5 h-5" />
                  </button>
                </div>
                <button onClick={handleNewChat}
                  className="flex items-center gap-2.5 px-5 py-3.5 text-[#888] hover:text-white hover:bg-[#161616] transition-colors text-[14px]">
                  <CirclePlusIcon className="w-4 h-4" /> New Chat
                </button>
                {[
                  { label: "AI Settings", panel: "model" as SidePanel,
                    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><path d="M18 2v4"/><path d="M22 6h-4"/></svg> },
                  { label: "System Prompt", panel: "settings" as SidePanel,
                    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
                  { label: "Data Controls", panel: "data" as SidePanel,
                    icon: <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
                ].map(({ label, panel, icon }) => (
                  <button key={label} onClick={() => setSidePanel(panel)}
                    className="flex items-center gap-2.5 px-5 py-3.5 text-[#888] hover:text-white hover:bg-[#161616] transition-colors text-[14px] border-t border-[#191919]">
                    {icon} {label}
                  </button>
                ))}
                <div className="border-t border-[#191919] mt-1" />
                <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2 flex flex-col gap-0.5">
                  {conversations.length === 0 && (
                    <p className="text-center text-[#2e2e2e] text-[13px] py-8">No conversations yet</p>
                  )}
                  {conversations.map(conv => {
                    const isCtx = contextConvId === conv.id;
                    const isRenaming = renamingId === conv.id;
                    return (
                      <div
                        key={conv.id}
                        onTouchStart={() => startLongPress(conv.id)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        onContextMenu={e => { e.preventDefault(); setRenameValue(conv.title); setContextConvId(conv.id); }}
                        onClick={() => { if (!isCtx) selectConversation(conv.id); else if (!isRenaming) setContextConvId(null); }}
                        className={`flex items-center gap-1 px-3 py-2.5 rounded-xl cursor-pointer transition-colors select-none ${activeId === conv.id ? "bg-[#1e1e1e] text-white" : "text-[#666] hover:bg-[#161616] hover:text-[#ccc]"}`}
                      >
                        {isRenaming ? (
                          <>
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleRenameConfirm();
                                if (e.key === "Escape") { setRenamingId(null); setContextConvId(null); }
                              }}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 min-w-0 bg-transparent text-white text-[13px] outline-none border-b border-[#444]"
                            />
                            <button
                              onClick={e => { e.stopPropagation(); handleRenameConfirm(); }}
                              className="shrink-0 text-[#888] hover:text-white text-[12px] px-1.5 py-0.5 rounded transition-colors"
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 min-w-0 text-[13px] truncate">{conv.title}</span>
                            {isCtx && (
                              <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => { setRenamingId(conv.id); setRenameValue(conv.title); }}
                                  className="p-1.5 text-[#555] hover:text-white rounded-lg transition-colors"
                                  title="Rename"
                                >
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(conv.id)}
                                  className="p-1.5 text-[#e05555] hover:text-red-400 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {sidePanel === "settings" && <SettingsPanel onClose={() => setSidePanel("menu")} />}
            {sidePanel === "data"     && <DataControlsPanel onClose={() => setSidePanel("menu")} />}
            {sidePanel === "model"    && <ModelSettingsPanel onClose={() => setSidePanel("menu")} />}
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2 flex-shrink-0">
        <button onClick={e => { e.stopPropagation(); setSidePanel("menu"); }}
          className="text-[#888] hover:text-white transition-colors w-10 h-10 flex items-center justify-center">
          <HamburgerIcon className="w-5 h-5" />
        </button>
        {isStreaming
          ? <span className="text-[#3a3a3a] text-[12px] tracking-widest animate-pulse">generating</span>
          : activeConvTitle !== "New Chat" && hasMessages
            ? <span className="text-[#2e2e2e] text-[12px] truncate max-w-[180px]">{activeConvTitle}</span>
            : null
        }
        <button onClick={e => { e.stopPropagation(); handleNewChat(); }}
          className="text-[#888] hover:text-white transition-colors w-10 h-10 flex items-center justify-center">
          <CirclePlusIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] text-[#ccc] text-[13px] px-4 py-2 rounded-full border border-[#282828] shadow-xl whitespace-nowrap pointer-events-none toast-in">
          {toast}
        </div>
      )}

      {/* Scroll-to-bottom button — only visible when user scrolled up during generation */}
      {showScrollBtn && (
        <div className="absolute bottom-[130px] left-1/2 -translate-x-1/2 z-30 scroll-btn-in">
          <button
            onClick={scrollToBottomForce}
            className="flex items-center gap-2.5 bg-white text-[#080808] text-[13px] font-semibold px-5 py-2.5 rounded-full shadow-2xl hover:bg-[#e8e8e8] transition-all active:scale-95"
            style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Jump to latest
          </button>
        </div>
      )}

      {/* Messages — MutationObserver handles scroll, never disturbs user position */}
      <div
        ref={messagesContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 overflow-y-auto no-scrollbar px-5"
      >
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-start h-full gap-1.5 pt-20">
            <p className="text-white text-[24px] font-semibold flex items-center gap-2.5 flex-wrap justify-center text-center leading-snug">
              Start chatting with an Expert
              <QwenLogoInline className="h-12 w-auto inline-block" />
            </p>
            <p className="text-[#555] text-[15px]">For complex problems, busy at peak times</p>
          </div>
        ) : (
          <MessagesList
            messages={streamingMessages}
            isStreaming={isStreaming}
            isStopped={isStopped}
            onContinue={handleContinue}
            onRegenerate={handleRegenerate}
            endRef={messagesEndRef}
            newFromIdx={newFromIdx}
          />
        )}
      </div>

      {/* Bottom input area */}
      <div className="flex-shrink-0 pt-2 pb-8" onClick={e => e.stopPropagation()}>
        {activeDescription === "think"  && <ToggleDescription text={isThinkActive  ? THINK_ON_LABEL  : THINK_OFF_LABEL} />}
        {activeDescription === "search" && <ToggleDescription text={isSearchActive ? SEARCH_ON_LABEL : SEARCH_OFF_LABEL} />}

        <div className="mx-3 bg-[#181818] rounded-[24px] px-4 pt-3.5 pb-3.5 flex flex-col gap-2.5 border border-[#222]">
          {/* File chip */}
          {selectedFile && (
            <div className="flex items-center gap-2 bg-[#232323] rounded-xl px-3 py-2 w-fit max-w-full msg-in">
              {selectedFile.preview
                ? <img src={selectedFile.preview} alt={selectedFile.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                : <DocumentIcon className="w-4 h-4 text-[#666] shrink-0" />
              }
              <div className="flex flex-col min-w-0">
                <span className="text-[#ddd] text-[13px] truncate max-w-[180px]">{selectedFile.name}</span>
                <span className="text-[#555] text-[11px]">
                  {selectedFile.preview ? "AI can see this" : selectedFile.textContent !== undefined ? "AI can read this" : "Filename only"}
                </span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-[#555] hover:text-white ml-auto shrink-0 transition-colors">
                <CircleXIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => { setMessage(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            rows={1}
            className="w-full bg-transparent text-white text-[15px] placeholder-[#444] resize-none outline-none max-h-40 overflow-y-auto leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); toggleThink(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-all ${isThinkActive ? "border-[#4a4a4a] text-white bg-[#242424]" : "border-[#252525] text-[#666] hover:border-[#353535] hover:text-[#999]"}`}
              >
                <ThinkIcon className="w-[14px] h-[14px]" /> Think
              </button>
              <button
                onClick={e => { e.stopPropagation(); toggleSearch(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-all ${isSearchActive ? "border-[#4a4a4a] text-white bg-[#242424]" : "border-[#252525] text-[#666] hover:border-[#353535] hover:text-[#999]"}`}
              >
                <SearchIcon className="w-[14px] h-[14px]" /> Search
              </button>
            </div>

            {/* Send / Stop buttons */}
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#333] flex items-center justify-center text-[#888] hover:text-white hover:border-[#555] transition-all active:scale-95"
                title="Stop generation"
              >
                <StopIcon className="w-3.5 h-3.5" />
              </button>
            ) : canSend ? (
              <button
                onClick={() => handleSend()}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); setIsAttachOpen(v => !v); }}
                className="text-[#666] hover:text-white transition-colors"
              >
                {isAttachOpen ? <CircleXIcon className="w-7 h-7" /> : <CirclePlusIcon className="w-7 h-7" />}
              </button>
            )}
          </div>
        </div>

        {/* Attachment tray */}
        {isAttachOpen && (
          <div className="mt-3 mx-3 msg-in">
            <div className="grid grid-cols-3 gap-3">
              {[
                { ref: cameraInputRef,   icon: <CameraIcon   className="w-6 h-6 text-white" />, label: "Camera" },
                { ref: photoInputRef,    icon: <PhotoIcon    className="w-6 h-6 text-white" />, label: "Photo" },
                { ref: documentInputRef, icon: <DocumentIcon className="w-6 h-6 text-white" />, label: "Document" },
              ].map(({ ref, icon, label }) => (
                <button key={label}
                  onClick={() => (ref as React.RefObject<HTMLInputElement>).current?.click()}
                  className="flex flex-col items-center justify-center gap-3 bg-[#181818] active:bg-[#222] border border-[#222] rounded-2xl py-7 transition-colors">
                  {icon}
                  <span className="text-white text-[13px] font-medium">{label}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-[12px] text-[#333] mt-3 flex items-center justify-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Images sent to vision AI · Code files read directly
            </p>
          </div>
        )}

        <div className="flex justify-center mt-5">
          <div className="w-28 h-[3px] bg-white/8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
