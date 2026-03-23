'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { isDarkMode } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}
    >
      <div className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className={`w-full resize-none border rounded-lg px-4 py-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400 focus:border-blue-500'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'
            }`}
            rows={1}
            style={{
              minHeight: '48px',
              maxHeight: '120px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2 mt-4">
        {[
          'Convert 100 USDC to USD',
          'Check conversion rates',
          'View transaction history',
        ].map((suggestion, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setMessage(suggestion)}
            className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 transform hover:scale-105 ${
              isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
            }`}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </form>
  );
}
