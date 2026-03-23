'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import Message from './Message';

interface ChatMessagesProps {
  messages: ChatMessage[];
  onActionClick: (
    actionId: string,
    actionType: string,
    data?: Record<string, unknown>,
  ) => void;
  isLoading?: boolean;
}

export default function ChatMessages({
  messages,
  onActionClick,
  isLoading = false,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    // Always scroll to bottom when AI is generating or when new messages are added
    if (isLoading || messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100); // Slightly longer delay to ensure content is rendered

      return () => clearTimeout(timer);
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto p-6 space-y-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}
      style={{
        height: '100%',
        minHeight: '0',
        maxHeight: '100%',
      }}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div
            className={`text-center max-w-md transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <div
              className={`text-xl font-medium mb-3 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-900'
              }`}
            >
              Welcome to DexFiat
            </div>
            <div className="text-sm leading-relaxed">
              Start a conversation to convert your cryptocurrency to fiat
              currency through our secure platform.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-6">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              onActionClick={onActionClick}
            />
          ))}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
