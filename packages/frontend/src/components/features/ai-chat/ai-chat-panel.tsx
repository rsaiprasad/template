import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAiChat } from '@/hooks/use-ai-chat';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/stores/ai-chat-store';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { AiChatInput } from './ai-chat-input';
import { AiChatMessage } from './ai-chat-message';
import { AiChatVoiceIndicator } from './ai-chat-voice-indicator';

interface AiChatPanelProps {
  mode: 'voice' | 'chat';
}

export function AiChatPanel({ mode }: AiChatPanelProps) {
  const { messages, aiStatus, error, isConnected, isAuthenticated } = useAiChatStore();
  const { sendText, startVoice, stopVoice, isRecording, cancel, connect } = useAiChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-connect when panel opens
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiStatus]);

  return (
    <>
      {/* Header */}
      <SheetHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <SheetTitle className="text-sm">AI Assistant</SheetTitle>
          {mode === 'voice' && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Voice
            </span>
          )}
          {/* Connection status dot */}
          <div
            className={cn(
              'ml-auto h-2 w-2 rounded-full',
              isConnected && isAuthenticated
                ? 'bg-green-500'
                : isConnected
                  ? 'bg-yellow-500'
                  : 'bg-muted-foreground/30'
            )}
            title={
              isConnected && isAuthenticated
                ? 'Connected'
                : isConnected
                  ? 'Authenticating...'
                  : 'Disconnected'
            }
          />
        </div>
        <SheetDescription className="sr-only">Chat with the AI assistant</SheetDescription>
      </SheetHeader>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !error && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {isConnected ? 'Ask me anything about this dashboard.' : 'Connecting...'}
            </p>
          </div>
        )}

        {mode === 'voice' && messages.length === 0 && isConnected && (
          <AiChatVoiceIndicator status={aiStatus} isRecording={isRecording} />
        )}

        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <AiChatMessage key={msg.id} message={msg} />
          ))}

          {/* AI status indicator */}
          {aiStatus === 'thinking' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Thinking...</span>
              <button
                type="button"
                onClick={cancel}
                className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Voice indicator in chat mode (only when in voice state) */}
      {mode === 'voice' && messages.length > 0 && (aiStatus !== 'idle' || isRecording) && (
        <AiChatVoiceIndicator status={aiStatus} isRecording={isRecording} />
      )}

      {/* Input */}
      <AiChatInput
        mode={mode}
        isConnected={isConnected}
        isAuthenticated={isAuthenticated}
        isRecording={isRecording}
        onSendText={sendText}
        onStartVoice={startVoice}
        onStopVoice={stopVoice}
      />
    </>
  );
}
