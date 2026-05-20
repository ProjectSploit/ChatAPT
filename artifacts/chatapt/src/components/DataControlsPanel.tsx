import React, { useState, useEffect, useRef } from "react";
import {
  getAllMemories,
  deleteMemory,
  clearAllMemories,
  getAllDocuments,
  deleteDocument,
  clearAllDocuments,
  addDocument,
  getStorageEstimate,
  requestPersistentStorage,
  formatBytes,
  type Memory,
  type StoredDocument,
} from "@/lib/memory";

interface Props {
  onClose: () => void;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#22c55e";
  return (
    <div className="w-full h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function DataControlsPanel({ onClose }: Props) {
  const [tab, setTab] = useState<"memories" | "documents">("memories");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [storage, setStorage] = useState({ used: 0, quota: 0 });
  const [isPersistent, setIsPersistent] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAll();
    navigator.storage?.persisted?.().then(setIsPersistent);
  }, []);

  async function loadAll() {
    setLoading(true);
    const [mems, docs, est] = await Promise.all([
      getAllMemories(),
      getAllDocuments(),
      getStorageEstimate(),
    ]);
    setMemories(mems);
    setDocuments(docs);
    setStorage(est);
    setLoading(false);
  }

  const handleDeleteMemory = async (id: number) => {
    await deleteMemory(id);
    setMemories((p) => p.filter((m) => m.id !== id));
  };

  const handleDeleteDoc = async (id: number) => {
    await deleteDocument(id);
    setDocuments((p) => p.filter((d) => d.id !== id));
    const est = await getStorageEstimate();
    setStorage(est);
  };

  const handleClearMemories = async () => {
    await clearAllMemories();
    setMemories([]);
  };

  const handleClearDocs = async () => {
    await clearAllDocuments();
    setDocuments([]);
    const est = await getStorageEstimate();
    setStorage(est);
  };

  const handleRequestPersist = async () => {
    const ok = await requestPersistentStorage();
    setIsPersistent(ok);
    const est = await getStorageEstimate();
    setStorage(est);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      let content = "";
      try {
        content = await file.text();
      } catch { content = "[Binary file — content unavailable]"; }
      await addDocument({
        name: file.name,
        content,
        size: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      });
    }
    e.target.value = "";
    const [docs, est] = await Promise.all([getAllDocuments(), getStorageEstimate()]);
    setDocuments(docs);
    setStorage(est);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const TARGET_STORAGE = 20 * 1024 * 1024 * 1024; // 20 GB for display reference

  return (
    <div className="flex flex-col h-full">
      <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.json,.yaml,.pdf,.py,.js,.ts" className="hidden" onChange={handleDocumentUpload} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[#1f1f1f]">
        <h2 className="text-white font-semibold text-base">Data Controls</h2>
        <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Storage stats */}
        <div className="px-5 py-4 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#999] text-[13px]">Device Storage</span>
            <span className="text-[#666] text-[12px]">
              {formatBytes(storage.used)} / {formatBytes(Math.max(storage.quota, TARGET_STORAGE))}
            </span>
          </div>
          <ProgressBar value={storage.used} max={Math.max(storage.quota, TARGET_STORAGE)} />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isPersistent ? "bg-green-500" : "bg-yellow-500"}`} />
              <span className="text-[12px] text-[#666]">
                {isPersistent ? "Persistent storage granted" : "Temporary storage"}
              </span>
            </div>
            {!isPersistent && (
              <button onClick={handleRequestPersist} className="text-[12px] text-[#7aa2f7] hover:text-white transition-colors">
                Request 20 GB
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a1a1a]">
          {(["memories", "documents"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[13px] font-medium transition-colors capitalize ${
                tab === t ? "text-white border-b-2 border-white" : "text-[#666] hover:text-[#aaa]"
              }`}
            >
              {t} ({t === "memories" ? memories.length : documents.length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#555] text-[13px]">Loading…</div>
        ) : tab === "memories" ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[#666] text-[12px]">Auto-saved from conversations</span>
              {memories.length > 0 && (
                <button onClick={handleClearMemories} className="text-[12px] text-red-500 hover:text-red-400 transition-colors">
                  Clear all
                </button>
              )}
            </div>
            {memories.length === 0 ? (
              <div className="px-5 py-8 text-center text-[#444] text-[13px]">
                No memories yet. Start chatting and memories will be saved automatically.
              </div>
            ) : (
              <div className="divide-y divide-[#141414]">
                {memories.map((mem) => (
                  <div key={mem.id} className="px-5 py-3 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#ccc] text-[13px] leading-relaxed line-clamp-3">{mem.content}</p>
                      <p className="text-[#444] text-[11px] mt-1">
                        {mem.conversationTitle} · {formatDate(mem.createdAt)}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteMemory(mem.id!)} className="text-[#444] hover:text-red-500 transition-colors shrink-0 mt-0.5">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[#666] text-[12px]">Knowledge base — used in AI context</span>
              {documents.length > 0 && (
                <button onClick={handleClearDocs} className="text-[12px] text-red-500 hover:text-red-400 transition-colors">
                  Clear all
                </button>
              )}
            </div>
            <div className="px-5 pb-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-2xl border border-dashed border-[#2a2a2a] text-[#666] text-[13px] hover:border-[#444] hover:text-[#aaa] transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload documents
              </button>
            </div>
            {documents.length === 0 ? (
              <div className="px-5 py-6 text-center text-[#444] text-[13px]">
                No documents. Upload files to give the AI access to local knowledge.
              </div>
            ) : (
              <div className="divide-y divide-[#141414]">
                {documents.map((doc) => (
                  <div key={doc.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#ccc] text-[13px] truncate">{doc.name}</p>
                      <p className="text-[#444] text-[11px] mt-0.5">
                        {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteDoc(doc.id!)} className="text-[#444] hover:text-red-500 transition-colors shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
