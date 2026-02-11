import { cn } from '@/lib/utils';

interface AiChatVoiceIndicatorProps {
  status: 'listening' | 'thinking' | 'speaking' | 'idle';
  isRecording: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
  idle: 'Ready',
};

export function AiChatVoiceIndicator({ status, isRecording }: AiChatVoiceIndicatorProps) {
  const label = STATUS_LABELS[status] ?? 'Ready';

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Pulsing circle / waveform */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Outer pulse ring */}
        {(status === 'speaking' || isRecording) && (
          <div
            className={cn(
              'absolute inset-0 rounded-full',
              status === 'speaking'
                ? 'animate-ping bg-primary/20'
                : 'animate-pulse bg-destructive/20'
            )}
          />
        )}

        {/* Inner circle */}
        <div
          className={cn(
            'relative z-10 flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-300',
            status === 'speaking' && 'bg-primary/30',
            isRecording && 'bg-destructive/30',
            status === 'thinking' && 'bg-muted',
            status === 'idle' && !isRecording && 'bg-muted'
          )}
        >
          {/* Waveform bars (visible when recording) */}
          {isRecording && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-destructive"
                  style={{
                    animation: `waveform 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                    height: '8px',
                  }}
                />
              ))}
            </div>
          )}

          {/* Thinking dots */}
          {status === 'thinking' && (
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-muted-foreground"
                  style={{
                    animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Speaking animation */}
          {status === 'speaking' && !isRecording && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-primary"
                  style={{
                    animation: `waveform 0.6s ease-in-out ${i * 0.08}s infinite alternate`,
                    height: '8px',
                  }}
                />
              ))}
            </div>
          )}

          {/* Idle state */}
          {status === 'idle' && !isRecording && (
            <div className="h-3 w-3 rounded-full bg-muted-foreground/50" />
          )}
        </div>
      </div>

      {/* Status text */}
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      {/* Inline CSS keyframes */}
      <style>{`
        @keyframes waveform {
          0% { height: 4px; }
          100% { height: 20px; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
