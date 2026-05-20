import { openDB, DBSchema, IDBPDatabase } from "idb";

interface Memory {
  id?: number;
  content: string;
  conversationId: number | null;
  conversationTitle: string;
  createdAt: string;
}

interface StoredDocument {
  id?: number;
  name: string;
  content: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface AINote {
  key: string;
  content: string;
  updatedAt: string;
}

interface ChatAPTDB extends DBSchema {
  memories: {
    key: number;
    value: Memory;
    indexes: { "by-date": string };
  };
  documents: {
    key: number;
    value: StoredDocument;
    indexes: { "by-date": string };
  };
  aiNotes: {
    key: string;
    value: AINote;
  };
}

let _db: IDBPDatabase<ChatAPTDB> | null = null;

async function getDB(): Promise<IDBPDatabase<ChatAPTDB>> {
  if (_db) return _db;
  _db = await openDB<ChatAPTDB>("chatapt-storage", 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const memStore = db.createObjectStore("memories", { keyPath: "id", autoIncrement: true });
        memStore.createIndex("by-date", "createdAt");
        const docStore = db.createObjectStore("documents", { keyPath: "id", autoIncrement: true });
        docStore.createIndex("by-date", "createdAt");
      }
      if (oldVersion < 2) {
        db.createObjectStore("aiNotes", { keyPath: "key" });
      }
    },
  });
  return _db;
}

// ─── Memories ─────────────────────────────────────────────────────────────────

export async function addMemory(
  content: string,
  conversationId: number | null,
  conversationTitle: string
): Promise<void> {
  const db = await getDB();
  await db.add("memories", { content, conversationId, conversationTitle, createdAt: new Date().toISOString() });
}

export async function getAllMemories(): Promise<Memory[]> {
  const db = await getDB();
  return (await db.getAllFromIndex("memories", "by-date")).reverse();
}

export async function deleteMemory(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("memories", id);
}

export async function clearAllMemories(): Promise<void> {
  const db = await getDB();
  await db.clear("memories");
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function addDocument(doc: Omit<StoredDocument, "id">): Promise<void> {
  const db = await getDB();
  await db.add("documents", doc);
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const db = await getDB();
  return (await db.getAllFromIndex("documents", "by-date")).reverse();
}

export async function deleteDocument(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("documents", id);
}

export async function clearAllDocuments(): Promise<void> {
  const db = await getDB();
  await db.clear("documents");
}

// ─── AI Notes (private scratchpad only the AI sees) ───────────────────────────

export async function setAINote(key: string, content: string): Promise<void> {
  const db = await getDB();
  await db.put("aiNotes", { key, content, updatedAt: new Date().toISOString() });
}

export async function deleteAINote(key: string): Promise<void> {
  const db = await getDB();
  await db.delete("aiNotes", key);
}

export async function getAllAINotes(): Promise<AINote[]> {
  const db = await getDB();
  return db.getAll("aiNotes");
}

export async function clearAllAINotes(): Promise<void> {
  const db = await getDB();
  await db.clear("aiNotes");
}

// ─── Storage utils ────────────────────────────────────────────────────────────

export async function getStorageEstimate(): Promise<{ used: number; quota: number }> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const est = await navigator.storage.estimate();
    return { used: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { used: 0, quota: 0 };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if ("storage" in navigator && "persist" in navigator.storage) {
    return await navigator.storage.persist();
  }
  return false;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export type { Memory, StoredDocument, AINote };
