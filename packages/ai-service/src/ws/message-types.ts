// ── Client → Server messages ──

export interface AuthMessage {
  type: 'auth';
  token: string;
}

export interface TextMessage {
  type: 'text';
  content: string;
}

export interface AudioChunkMessage {
  type: 'audio_chunk';
  data: string;
}

export interface AudioEndMessage {
  type: 'audio_end';
}

export interface CancelMessage {
  type: 'cancel';
}

export interface AuthRefreshMessage {
  type: 'auth_refresh';
  token: string;
}

export type ClientMessage =
  | AuthMessage
  | TextMessage
  | AudioChunkMessage
  | AudioEndMessage
  | CancelMessage
  | AuthRefreshMessage;

// ── Server → Client messages ──

export interface AuthenticatedMessage {
  type: 'authenticated';
  user: {
    uid: string;
    email: string;
    displayName: string;
  };
}

export interface GreetingMessage {
  type: 'greeting';
  content: string;
}

export interface ServerTextMessage {
  type: 'text';
  content: string;
  done: boolean;
}

export interface ServerAudioChunkMessage {
  type: 'audio_chunk';
  data: string;
}

export interface ToolCallMessage {
  type: 'tool_call';
  name: string;
  status: 'calling' | 'done' | 'error';
  result?: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}

export interface StatusMessage {
  type: 'status';
  status: 'thinking' | 'speaking' | 'listening' | 'idle';
}

export type ServerMessage =
  | AuthenticatedMessage
  | GreetingMessage
  | ServerTextMessage
  | ServerAudioChunkMessage
  | ToolCallMessage
  | ErrorMessage
  | StatusMessage;
