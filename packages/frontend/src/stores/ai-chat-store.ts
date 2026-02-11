import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: Array<{ name: string; status: 'calling' | 'done' | 'error' }>;
}

interface AiChatState {
  isOpen: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  messages: ChatMessage[];
  aiStatus: 'thinking' | 'speaking' | 'listening' | 'idle';
  error: string | null;
  streamingContent: string;
}

interface AiChatActions {
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setConnected: (connected: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string, done: boolean) => void;
  appendStreamingContent: (chunk: string) => void;
  finalizeStreamingMessage: () => void;
  setAiStatus: (status: AiChatState['aiStatus']) => void;
  setError: (error: string | null) => void;
  addToolCall: (name: string, status: 'calling' | 'done' | 'error') => void;
  clearMessages: () => void;
  reset: () => void;
}

type AiChatStore = AiChatState & AiChatActions;

const initialState: AiChatState = {
  isOpen: false,
  isConnected: false,
  isAuthenticated: false,
  messages: [],
  aiStatus: 'idle',
  error: null,
  streamingContent: '',
};

export const useAiChatStore = create<AiChatStore>()((set) => ({
  ...initialState,

  setOpen: (open: boolean) => set({ isOpen: open }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setConnected: (connected: boolean) => set({ isConnected: connected }),

  setAuthenticated: (authenticated: boolean) => set({ isAuthenticated: authenticated }),

  addMessage: (message: ChatMessage) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastAssistantMessage: (content: string, done: boolean) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      const last = messages[lastIndex];
      if (last && last.role === 'assistant') {
        messages[lastIndex] = { ...last, content };
      }
      return { messages, streamingContent: done ? '' : content };
    }),

  appendStreamingContent: (chunk: string) =>
    set((state) => {
      const newContent = state.streamingContent + chunk;
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      const last = messages[lastIndex];
      if (last && last.role === 'assistant') {
        messages[lastIndex] = { ...last, content: newContent };
      }
      return { streamingContent: newContent, messages };
    }),

  finalizeStreamingMessage: () =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      const last = messages[lastIndex];
      if (last && last.role === 'assistant') {
        messages[lastIndex] = { ...last, content: state.streamingContent || last.content };
      }
      return { streamingContent: '', messages };
    }),

  setAiStatus: (status: AiChatState['aiStatus']) => set({ aiStatus: status }),

  setError: (error: string | null) => set({ error }),

  addToolCall: (name: string, status: 'calling' | 'done' | 'error') =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      const last = messages[lastIndex];
      if (last && last.role === 'assistant') {
        const toolCalls = [...(last.toolCalls ?? [])];
        const existingIndex = toolCalls.findIndex((tc) => tc.name === name);
        if (existingIndex >= 0) {
          toolCalls[existingIndex] = { name, status };
        } else {
          toolCalls.push({ name, status });
        }
        messages[lastIndex] = { ...last, toolCalls };
      }
      return { messages };
    }),

  clearMessages: () => set({ messages: [], streamingContent: '' }),

  reset: () => set(initialState),
}));

export default useAiChatStore;
