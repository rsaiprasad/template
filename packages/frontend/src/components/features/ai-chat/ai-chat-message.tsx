import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { ChatMessage } from '@/stores/ai-chat-store';
import { Bot, User } from 'lucide-react';
import { AiChatToolStatus } from './ai-chat-tool-status';

interface AiChatMessageProps {
  message: ChatMessage;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AiChatMessage({ message }: AiChatMessageProps) {
  const isUser = message.role === 'user';
  const authUser = useAuthStore((s) => s.user);

  return (
    <div className={cn('group flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <Avatar className="h-7 w-7">
        {isUser && authUser?.photoURL && (
          <AvatarImage src={authUser.photoURL} alt={authUser.displayName || 'User'} />
        )}
        <AvatarFallback
          className={cn(
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className={cn('flex max-w-[80%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          )}
        >
          {/* Render content as plain text with line breaks */}
          {message.content.split('\n').map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {renderTextWithFormatting(line)}
            </span>
          ))}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1">
            {message.toolCalls.map((tc) => (
              <AiChatToolStatus key={tc.name} name={tc.name} status={tc.status} />
            ))}
          </div>
        )}

        {/* Timestamp on hover */}
        <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

/** Simple inline formatting: **bold** */
function renderTextWithFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
