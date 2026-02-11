import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Send } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface AiChatInputProps {
  mode: 'voice' | 'chat';
  isConnected: boolean;
  isAuthenticated: boolean;
  isRecording: boolean;
  onSendText: (content: string) => void;
  onStartVoice: () => Promise<void>;
  onStopVoice: () => void;
}

export function AiChatInput({
  mode,
  isConnected,
  isAuthenticated,
  isRecording,
  onSendText,
  onStartVoice,
  onStopVoice,
}: AiChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const disabled = !isConnected || !isAuthenticated;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, onSendText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      onStopVoice();
    } else {
      await onStartVoice();
    }
  }, [isRecording, onStartVoice, onStopVoice]);

  if (mode === 'voice') {
    return (
      <div className="flex items-center justify-center border-t p-4">
        <Button
          size="icon"
          variant={isRecording ? 'destructive' : 'default'}
          disabled={disabled}
          onClick={handleVoiceToggle}
          className={cn(
            'h-16 w-16 rounded-full transition-all duration-200',
            isRecording && 'shadow-lg scale-110'
          )}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 border-t p-3">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Connecting...' : 'Type a message...'}
        disabled={disabled}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'max-h-[120px]'
        )}
      />
      <Button
        size="icon"
        disabled={disabled || !text.trim()}
        onClick={handleSend}
        className="h-9 w-9 shrink-0"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
