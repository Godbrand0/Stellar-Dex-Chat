import { ReactNode } from 'react';

interface ScrollableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  footer?: ReactNode;
}

export default function ScrollableModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  footer,
}: ScrollableModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        className={`bg-gray-900 border border-gray-700 rounded-lg w-full ${maxWidth} max-h-[85vh] flex flex-col shadow-2xl`}
      >
        {/* Fixed Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-800"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </div>

        {/* Fixed Footer (optional) */}
        {footer && (
          <div className="p-6 border-t border-gray-700 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
