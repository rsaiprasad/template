import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/stores/ai-chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { MessageSquare, X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { AiChatPanel } from './ai-chat-panel';

type AiAssistantMode = 'voice' | 'chat' | 'disabled';

export function AiChatWidget() {
  const authUser = useAuthStore((s) => s.user);
  const { isOpen, toggleOpen } = useAiChatStore();

  // Permission + feature gate
  const hasPermission = authUser?.isSuperAdmin || authUser?.permissions?.includes('ai:use');

  // Default aiAssistant to 'chat' since settings may not have it yet
  // TODO: read from app settings when available
  const aiMode = 'chat' as AiAssistantMode;

  // Keyboard shortcut: Ctrl+Shift+A to toggle
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleOpen();
      }
    },
    [toggleOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!hasPermission || aiMode === 'disabled') return null;

  return (
    <>
      {isOpen && <AiChatPanel mode={aiMode as 'voice' | 'chat'} />}

      {/* Floating action button */}
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex h-12 w-12 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'transition-all duration-200',
          'hover:bg-primary/90 hover:shadow-xl hover:scale-105',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isOpen && 'rotate-0'
        )}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
    </>
  );
}
