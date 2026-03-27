import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Lightweight localStorage mock (jsdom may not provide a full one in vitest)
// ---------------------------------------------------------------------------
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ---------------------------------------------------------------------------
// Import helpers directly (pure functions, no React hooks needed for logic)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'defi_chat_drafts';

type DraftEntry = { text: string; savedAt: number };
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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

// Simulate what the hook does for save/load/clear
function saveDraft(threadId: string, text: string, ttlMs: number): void {
  const s = pruneExpired(loadStore(), ttlMs);
  if (text.trim() === '') {
    delete s[threadId];
  } else {
    s[threadId] = { text, savedAt: Date.now() };
  }
  saveStore(s);
}

function loadDraft(threadId: string, ttlMs: number): string {
  const s = pruneExpired(loadStore(), ttlMs);
  return s[threadId]?.text ?? '';
}

function clearDraft(threadId: string): void {
  const s = loadStore();
  delete s[threadId];
  saveStore(s);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const TTL_1H = 60 * 60 * 1000;
const THREAD_A = 'session_001';
const THREAD_B = 'session_002';

beforeEach(() => {
  localStorageMock.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('draft save', () => {
  it('saves a draft for a given thread', () => {
    saveDraft(THREAD_A, 'hello world', TTL_1H);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('hello world');
  });

  it('overwrites an existing draft with the latest text', () => {
    saveDraft(THREAD_A, 'first', TTL_1H);
    saveDraft(THREAD_A, 'second', TTL_1H);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('second');
  });

  it('removes the entry when saving an empty (whitespace) string', () => {
    saveDraft(THREAD_A, 'some text', TTL_1H);
    saveDraft(THREAD_A, '   ', TTL_1H);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('');
  });

  it('stores drafts for multiple threads independently', () => {
    saveDraft(THREAD_A, 'draft A', TTL_1H);
    saveDraft(THREAD_B, 'draft B', TTL_1H);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('draft A');
    expect(loadDraft(THREAD_B, TTL_1H)).toBe('draft B');
  });
});

describe('draft restore', () => {
  it('returns empty string when no draft exists for a thread', () => {
    expect(loadDraft('nonexistent', TTL_1H)).toBe('');
  });

  it('returns the saved draft text for the correct thread', () => {
    saveDraft(THREAD_A, 'restore me', TTL_1H);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('restore me');
  });

  it('does not return another thread\'s draft', () => {
    saveDraft(THREAD_B, 'thread B only', TTL_1H);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('');
  });
});

describe('draft clear', () => {
  it('removes the draft for a thread', () => {
    saveDraft(THREAD_A, 'to be cleared', TTL_1H);
    clearDraft(THREAD_A);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('');
  });

  it('does not affect drafts for other threads', () => {
    saveDraft(THREAD_A, 'keep me', TTL_1H);
    saveDraft(THREAD_B, 'also keep', TTL_1H);
    clearDraft(THREAD_A);
    expect(loadDraft(THREAD_B, TTL_1H)).toBe('also keep');
  });
});

describe('draft expiry', () => {
  it('returns a draft that is within the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T10:00:00Z'));
    saveDraft(THREAD_A, 'fresh draft', TTL_1H);
    // Advance 30 minutes (within TTL)
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('fresh draft');
  });

  it('does not return a draft that has exceeded the TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T10:00:00Z'));
    saveDraft(THREAD_A, 'stale draft', TTL_1H);
    // Advance 2 hours (past TTL)
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('');
  });

  it('prunes only expired entries, leaving valid ones intact', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T10:00:00Z'));
    saveDraft(THREAD_A, 'will expire', TTL_1H);

    vi.advanceTimersByTime(90 * 60 * 1000); // 90 min later
    saveDraft(THREAD_B, 'still fresh', TTL_1H);

    // Now 90 min after THREAD_A was saved — it's expired
    // THREAD_B was just saved — it's fresh
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('');
    expect(loadDraft(THREAD_B, TTL_1H)).toBe('still fresh');
  });

  it('respects a custom short TTL', () => {
    const SHORT_TTL = 5 * 60 * 1000; // 5 minutes
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T10:00:00Z'));
    saveDraft(THREAD_A, 'short-lived', SHORT_TTL);
    vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
    expect(loadDraft(THREAD_A, SHORT_TTL)).toBe('');
  });
});

describe('localStorage corruption', () => {
  it('returns empty string gracefully when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json{{');
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('');
  });

  it('starts fresh when storage is empty', () => {
    expect(loadDraft(THREAD_A, TTL_1H)).toBe('');
  });
});
