import { getIdToken, getIdTokenForced } from '@/core/lib/firebase';
import { useAiChatStore } from '@/stores/ai-chat-store';
import type { ChatMessage } from '@/stores/ai-chat-store';
import { useCallback, useEffect, useRef } from 'react';

const AI_SERVICE_URL = process.env.PUBLIC_AI_SERVICE_URL || 'ws://localhost:3001';
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

interface ServerMessage {
  type: string;
  content?: string;
  done?: boolean;
  data?: string;
  name?: string;
  status?: 'calling' | 'done' | 'error' | 'thinking' | 'speaking' | 'listening' | 'idle';
  result?: string;
  message?: string;
  code?: string;
  user?: { uid: string; email: string; displayName: string };
}

export interface UseAiChat {
  isConnected: boolean;
  isAuthenticated: boolean;
  connect: () => void;
  disconnect: () => void;
  sendText: (content: string) => void;
  cancel: () => void;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  isRecording: boolean;
}

export function useAiChat(): UseAiChat {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalCloseRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isRecordingRef = useRef(false);
  const playbackContextRef = useRef<AudioContext | null>(null);

  const {
    isConnected,
    isAuthenticated,
    setConnected,
    setAuthenticated,
    addMessage,
    appendStreamingContent,
    finalizeStreamingMessage,
    setAiStatus,
    setError,
    addToolCall,
  } = useAiChatStore();

  const send = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'authenticated':
          setAuthenticated(true);
          setError(null);
          break;

        case 'greeting': {
          const greetingMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: msg.content ?? '',
            timestamp: Date.now(),
          };
          addMessage(greetingMsg);
          break;
        }

        case 'text': {
          const store = useAiChatStore.getState();
          const lastTextMsg = store.messages[store.messages.length - 1];
          const chunk = msg.content ?? '';

          if (store.streamingContent !== '') {
            // Already streaming — append chunk
            appendStreamingContent(chunk);
          } else if (lastTextMsg?.role === 'assistant' && lastTextMsg.content === '') {
            // Empty assistant message exists (from tool_call) — fill it in
            useAiChatStore.setState({
              messages: store.messages.map((m, i) =>
                i === store.messages.length - 1 ? { ...m, content: chunk } : m
              ),
              ...(msg.done ? {} : { streamingContent: chunk }),
            });
          } else {
            // New assistant message
            addMessage({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: chunk,
              timestamp: Date.now(),
            });
            // Only track streaming state if more chunks are coming
            if (!msg.done) {
              useAiChatStore.setState({ streamingContent: chunk });
            }
          }

          if (msg.done) {
            finalizeStreamingMessage();
            setAiStatus('idle');
          }
          break;
        }

        case 'audio_chunk': {
          // Decode base64 audio and play it
          if (msg.data) {
            playAudioChunk(msg.data);
          }
          break;
        }

        case 'tool_call': {
          if (msg.name && msg.status) {
            const status = msg.status as 'calling' | 'done' | 'error';
            // Create an assistant message if one doesn't exist yet (so tool indicators show)
            const toolStore = useAiChatStore.getState();
            const lastToolMsg = toolStore.messages[toolStore.messages.length - 1];
            if (!lastToolMsg || lastToolMsg.role !== 'assistant') {
              addMessage({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
              });
            }
            addToolCall(msg.name, status);
          }
          break;
        }

        case 'error':
          setError(msg.message ?? 'An error occurred');
          setAiStatus('idle');
          break;

        case 'status': {
          const validStatuses = ['thinking', 'speaking', 'listening', 'idle'] as const;
          type AiStatus = (typeof validStatuses)[number];
          if (msg.status && validStatuses.includes(msg.status as AiStatus)) {
            setAiStatus(msg.status as AiStatus);
          }
          break;
        }
      }
    },
    [
      setAuthenticated,
      setError,
      addMessage,
      appendStreamingContent,
      finalizeStreamingMessage,
      setAiStatus,
      addToolCall,
    ]
  );

  const playAudioChunk = useCallback((base64Data: string) => {
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      const ctx = playbackContextRef.current;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Interpret as 16-bit PCM
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = (int16[i] ?? 0) / 32768;
      }
      const buffer = ctx.createBuffer(1, float32.length, 16000);
      buffer.copyToChannel(float32, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch {
      // Audio playback error — ignore silently
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    intentionalCloseRef.current = false;
    const wsUrl = `${AI_SERVICE_URL.replace(/^http/, 'ws')}/ws/chat`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      setConnected(true);
      setError(null);
      reconnectAttemptRef.current = 0;

      // Send auth token
      const token = await getIdToken();
      if (token) {
        send({ type: 'auth', token });
      } else {
        setError('Not authenticated — please sign in');
        ws.close();
        return;
      }

      // Set up token refresh
      tokenRefreshTimerRef.current = setInterval(async () => {
        const freshToken = await getIdTokenForced();
        if (freshToken) {
          send({ type: 'auth_refresh', token: freshToken });
        }
      }, TOKEN_REFRESH_INTERVAL);
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setConnected(false);
      setAuthenticated(false);

      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }

      // Auto-reconnect with exponential backoff
      if (!intentionalCloseRef.current) {
        const delay = Math.min(
          RECONNECT_BASE_DELAY * 2 ** reconnectAttemptRef.current,
          RECONNECT_MAX_DELAY
        );
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      setError('Connection error');
    };
  }, [setConnected, setAuthenticated, setError, send, handleMessage]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (tokenRefreshTimerRef.current) {
      clearInterval(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
    setAuthenticated(false);
  }, [setConnected, setAuthenticated]);

  const sendText = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      send({ type: 'text', content });
    },
    [addMessage, send]
  );

  const cancel = useCallback(() => {
    send({ type: 'cancel' });
    setAiStatus('idle');
    finalizeStreamingMessage();
  }, [send, setAiStatus, finalizeStreamingMessage]);

  const startVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessorNode for PCM capture (4096 buffer)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert float32 to int16
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = inputData[i] ?? 0;
          const clamped = Math.max(-1, Math.min(1, sample));
          int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        }
        // Base64 encode
        const bytes = new Uint8Array(int16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i] ?? 0);
        }
        const base64 = btoa(binary);
        send({ type: 'audio_chunk', data: base64 });
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      isRecordingRef.current = true;
      useAiChatStore.setState({ aiStatus: 'listening' });
    } catch {
      setError('Microphone access denied');
    }
  }, [send, setError]);

  const stopVoice = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    isRecordingRef.current = false;
    send({ type: 'audio_end' });
  }, [send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (tokenRefreshTimerRef.current) clearInterval(tokenRefreshTimerRef.current);
      if (wsRef.current) wsRef.current.close();
      if (processorRef.current) processorRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
      }
      if (playbackContextRef.current) playbackContextRef.current.close();
    };
  }, []);

  return {
    isConnected,
    isAuthenticated,
    connect,
    disconnect,
    sendText,
    cancel,
    startVoice,
    stopVoice,
    isRecording: isRecordingRef.current,
  };
}

export default useAiChat;
