import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import { cors } from 'hono/cors';
import type { WSContext } from 'hono/ws';
import { fetchUserProfile } from './auth/verify-token.js';
import { config } from './config/index.js';
import { handleTextMessage } from './gemini/chat-mode.js';
import {
  endVoiceAudio,
  relayAudioChunk,
  startVoiceSession,
  stopVoiceSession,
} from './gemini/voice-mode.js';
import type { ClientMessage, ServerMessage } from './ws/message-types.js';
import {
  type UserData,
  checkRateLimit,
  createSession,
  destroySession,
  getSession,
} from './ws/session-manager.js';

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

// CORS middleware
app.use(
  '*',
  cors({
    origin: config.cors.origins,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function send(ws: WSContext, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

function parseMessage(data: string | ArrayBuffer): ClientMessage | null {
  try {
    const raw = typeof data === 'string' ? data : new TextDecoder().decode(data);
    return JSON.parse(raw) as ClientMessage;
  } catch {
    return null;
  }
}

// WebSocket chat endpoint
app.get(
  '/ws/chat',
  upgradeWebSocket(() => ({
    onOpen(_evt, _ws) {
      // Connection opened — wait for auth message
    },

    async onMessage(evt, ws) {
      const message = parseMessage(evt.data as string | ArrayBuffer);
      if (!message) {
        send(ws, { type: 'error', message: 'Invalid message format', code: 'PARSE_ERROR' });
        return;
      }

      switch (message.type) {
        case 'auth': {
          try {
            // Fetch full user profile from backend (backend verifies the token)
            const profile = await fetchUserProfile(message.token, config.backendUrl);

            const userData: UserData = {
              uid: profile.uid,
              email: profile.email,
              displayName: profile.displayName,
              permissions: profile.permissions,
              isSuperAdmin: profile.isSuperAdmin,
              idToken: message.token,
            };

            createSession(ws, userData);

            send(ws, {
              type: 'authenticated',
              user: {
                uid: profile.uid,
                email: profile.email,
                displayName: profile.displayName,
              },
            });

            send(ws, {
              type: 'greeting',
              content: `Hello, ${profile.displayName}! I'm your admin assistant. I can help you manage users, groups, permissions, and settings. What would you like to do?`,
            });
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Authentication failed';
            console.error('Auth error:', error);
            send(ws, { type: 'error', message: msg, code: 'AUTH_ERROR' });
          }
          break;
        }

        case 'auth_refresh': {
          const session = getSession(ws);
          if (!session) {
            send(ws, { type: 'error', message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
            return;
          }
          session.idToken = message.token;
          break;
        }

        case 'text': {
          const session = getSession(ws);
          if (!session) {
            send(ws, { type: 'error', message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
            return;
          }

          if (!checkRateLimit(session)) {
            send(ws, {
              type: 'error',
              message: 'Rate limit exceeded. Please wait a moment.',
              code: 'RATE_LIMITED',
            });
            return;
          }

          await handleTextMessage(ws, session, message.content);
          break;
        }

        case 'audio_chunk': {
          const session = getSession(ws);
          if (!session) {
            send(ws, { type: 'error', message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
            return;
          }

          if (session.mode !== 'voice') {
            session.mode = 'voice';
            await startVoiceSession(ws, session);
          }

          relayAudioChunk(ws, message.data);
          break;
        }

        case 'audio_end': {
          endVoiceAudio(ws);
          break;
        }

        case 'cancel': {
          const session = getSession(ws);
          if (session?.abortController) {
            session.abortController.abort();
          }
          stopVoiceSession(ws);
          send(ws, { type: 'status', status: 'idle' });
          break;
        }
      }
    },

    onClose(_evt, ws) {
      stopVoiceSession(ws);
      destroySession(ws);
    },

    onError(error, ws) {
      console.error('WebSocket error:', error);
      stopVoiceSession(ws);
      destroySession(ws);
    },
  }))
);

console.log(`AI service starting on port ${config.port}`);

export default {
  fetch: app.fetch,
  websocket,
  port: config.port,
};
