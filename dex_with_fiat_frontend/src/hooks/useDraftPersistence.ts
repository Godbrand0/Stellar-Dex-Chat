'use client';

import { useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'defi_chat_drafts';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DraftEntry {
  text: string;
  savedAt: number; // epoch ms
}

type DraftStore = Record<string, DraftEntry>;

function loadStore(): DraftStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DraftStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: DraftStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded or SSR — silently ignore
  }
}

function pruneExpired(store: DraftStore, ttlMs: number): DraftStore {
  const now = Date.now();
  const pruned: DraftStore = {};
  for (const [id, entry] of Object.entries(store)) {
    if (now - entry.savedAt < ttlMs) {
      pruned[id] = entry;
    }
  }
  return pruned;
}

interface UseDraftPersistenceOptions {
  threadId: string | null;
  ttlMs?: number;
}

interface UseDraftPersistenceReturn {
  saveDraft: (text: string) => void;
  loadDraft: () => string;
  clearDraft: () => void;
}

export function useDraftPersistence({
  threadId,
  ttlMs = DEFAULT_TTL_MS,
}: UseDraftPersistenceOptions): UseDraftPersistenceReturn {
  // Keep a ref to avoid recreating callbacks when ttlMs changes
  const ttlRef = useRef(ttlMs);
  useEffect(() => {
    ttlRef.current = ttlMs;
  }, [ttlMs]);

  // Prune expired entries once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const store = loadStore();
    const pruned = pruneExpired(store, ttlRef.current);
    if (Object.keys(pruned).length !== Object.keys(store).length) {
      saveStore(pruned);
    }
  }, []);

  const saveDraft = useCallback(
    (text: string) => {
      if (!threadId || typeof window === 'undefined') return;
      const store = pruneExpired(loadStore(), ttlRef.current);
      if (text.trim() === '') {
        delete store[threadId];
      } else {
        store[threadId] = { text, savedAt: Date.now() };
      }
      saveStore(store);
    },
    [threadId],
  );

  const loadDraft = useCallback((): string => {
    if (!threadId || typeof window === 'undefined') return '';
    const store = pruneExpired(loadStore(), ttlRef.current);
    return store[threadId]?.text ?? '';
  }, [threadId]);

  const clearDraft = useCallback(() => {
    if (!threadId || typeof window === 'undefined') return;
    const store = loadStore();
    delete store[threadId];
    saveStore(store);
  }, [threadId]);

  return { saveDraft, loadDraft, clearDraft };
}
