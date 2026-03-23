'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChatSession, ChatHistoryState, ChatMessage } from '@/types';
import { ChatHistoryManager } from '@/lib/chatHistory';
import { useStellarWallet } from '@/contexts/StellarWalletContext';

export const useChatHistory = () => {
  const { connection } = useStellarWallet();
  const [historyState, setHistoryState] = useState<ChatHistoryState>({
    currentSessionId: null,
    sessions: [],
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const loaded = ChatHistoryManager.loadFromLocalStorage();
    setHistoryState(loaded);
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    if (historyState.sessions.length > 0) {
      const timeoutId = setTimeout(() => {
        ChatHistoryManager.saveToLocalStorage(historyState);
      }, 500); // Debounce by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [historyState]);

  const createNewSession = useCallback(
    (initialMessages: ChatMessage[] = []): string => {
      const newSession = ChatHistoryManager.createNewSession(
        connection.address,
      );
      newSession.messages = [...initialMessages]; // Clone to prevent reference issues

      setHistoryState((prev) => {
        const updatedSessions = ChatHistoryManager.cleanupOldSessions([
          newSession,
          ...prev.sessions,
        ]);

        return {
          currentSessionId: newSession.id,
          sessions: updatedSessions,
        };
      });

      return newSession.id;
    },
    [connection.address],
  );

  const updateCurrentSession = useCallback(
    (messages: ChatMessage[]) => {
      if (!historyState.currentSessionId) return;

      setHistoryState((prev) => {
        const sessionIndex = prev.sessions.findIndex(
          (s) => s.id === prev.currentSessionId,
        );
        if (sessionIndex === -1) return prev;

        const updatedSession = {
          ...prev.sessions[sessionIndex],
          messages,
          lastUpdated: new Date(),
        };

        // Update title if this is the first user message
        const updatedSessionWithTitle =
          ChatHistoryManager.updateSessionTitle(updatedSession);

        const updatedSessions = [...prev.sessions];
        updatedSessions[sessionIndex] = updatedSessionWithTitle;

        return {
          ...prev,
          sessions: updatedSessions,
        };
      });
    },
    [historyState.currentSessionId],
  );

  const loadSession = useCallback(
    (sessionId: string): ChatMessage[] | null => {
      const session = historyState.sessions.find((s) => s.id === sessionId);
      if (!session) return null;

      setHistoryState((prev) => ({
        ...prev,
        currentSessionId: sessionId,
      }));

      return session.messages;
    },
    [historyState.sessions],
  );

  const deleteSession = useCallback((sessionId: string) => {
    setHistoryState((prev) => {
      const updatedSessions = prev.sessions.filter((s) => s.id !== sessionId);
      const newCurrentSessionId =
        prev.currentSessionId === sessionId ? null : prev.currentSessionId;

      return {
        currentSessionId: newCurrentSessionId,
        sessions: updatedSessions,
      };
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    setHistoryState({
      currentSessionId: null,
      sessions: [],
    });
    localStorage.removeItem('defi_chat_history');
  }, []);

  const exportSession = useCallback(
    (sessionId: string): string | null => {
      const session = historyState.sessions.find((s) => s.id === sessionId);
      if (!session) return null;

      return ChatHistoryManager.exportSession(session);
    },
    [historyState.sessions],
  );

  const searchSessions = useCallback(
    (query: string): ChatSession[] => {
      return ChatHistoryManager.searchSessions(historyState.sessions, query);
    },
    [historyState.sessions],
  );

  const getCurrentSession = useCallback((): ChatSession | null => {
    if (!historyState.currentSessionId) return null;
    return (
      historyState.sessions.find(
        (s) => s.id === historyState.currentSessionId,
      ) || null
    );
  }, [historyState.currentSessionId, historyState.sessions]);

  return {
    // State
    sessions: historyState.sessions,
    currentSessionId: historyState.currentSessionId,
    currentSession: getCurrentSession(),
    isHistoryOpen,

    // Actions
    createNewSession,
    updateCurrentSession,
    loadSession,
    deleteSession,
    clearAllHistory,
    exportSession,
    searchSessions,
    setIsHistoryOpen,

    // Utils
    hasHistory: historyState.sessions.length > 0,
  };
};
