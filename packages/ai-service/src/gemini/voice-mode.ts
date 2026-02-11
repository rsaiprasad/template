import type { WSContext } from 'hono/ws';
import WebSocket from 'ws';
import { config } from '../config/index.js';
import { buildSystemPrompt } from '../guardrails/system-prompt.js';
import { executeTool } from '../tools/tool-executor.js';
import { getToolsForUser } from '../tools/tool-registry.js';
import type { ServerMessage } from '../ws/message-types.js';
import type { Session } from '../ws/session-manager.js';

function send(ws: WSContext, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

interface LiveSession {
  geminiWs: WebSocket;
  isSetup: boolean;
}

// Key by raw WebSocket (stable), not WSContext (recreated per event)
// biome-ignore lint/suspicious/noExplicitAny: raw ws type varies by runtime
const liveSessions = new Map<any, LiveSession>();
// biome-ignore lint/suspicious/noExplicitAny: raw ws type varies by runtime
function wsKey(ws: WSContext): any {
  return ws.raw;
}

function buildGeminiLiveUrl(): string {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.gemini.apiKey}`;
}

export async function startVoiceSession(ws: WSContext, session: Session): Promise<void> {
  try {
    const tools = getToolsForUser(session.permissions, session.isSuperAdmin);
    const systemPrompt = buildSystemPrompt(session);

    const geminiWs = new WebSocket(buildGeminiLiveUrl());
    const liveSession: LiveSession = { geminiWs, isSetup: false };
    liveSessions.set(wsKey(ws), liveSession);

    geminiWs.on('open', () => {
      // Send setup message with model config, tools, and system instruction
      const setupMessage = {
        setup: {
          model: `models/${config.gemini.liveModel}`,
          generationConfig: {
            responseModalities: ['AUDIO', 'TEXT'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Aoede' },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
        },
      };
      geminiWs.send(JSON.stringify(setupMessage));
      liveSession.isSetup = true;
      send(ws, { type: 'status', status: 'listening' });
    });

    geminiWs.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle server content (text/audio responses)
        if (message.serverContent) {
          const parts = message.serverContent.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.text) {
                send(ws, { type: 'text', content: part.text, done: false });
              }
              if (part.inlineData) {
                send(ws, {
                  type: 'audio_chunk',
                  data: part.inlineData.data,
                });
              }
            }
          }
          if (message.serverContent.turnComplete) {
            send(ws, { type: 'text', content: '', done: true });
            send(ws, { type: 'status', status: 'listening' });
          }
        }

        // Handle tool calls
        if (message.toolCall) {
          send(ws, { type: 'status', status: 'thinking' });
          const functionCalls = message.toolCall.functionCalls || [];
          const functionResponses = [];

          for (const call of functionCalls) {
            send(ws, {
              type: 'tool_call',
              name: call.name,
              status: 'calling',
            });

            try {
              const result = await executeTool(
                call.name,
                call.args || {},
                session,
                config.backendUrl
              );

              send(ws, {
                type: 'tool_call',
                name: call.name,
                status: 'done',
                result,
              });

              functionResponses.push({
                name: call.name,
                response: JSON.parse(result),
              });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Tool failed';
              send(ws, {
                type: 'tool_call',
                name: call.name,
                status: 'error',
                result: errorMsg,
              });
              functionResponses.push({
                name: call.name,
                response: { error: errorMsg },
              });
            }
          }

          // Send tool results back to Gemini Live
          geminiWs.send(
            JSON.stringify({
              toolResponse: { functionResponses },
            })
          );
        }
      } catch (error) {
        console.error('Voice mode message parse error:', error);
      }
    });

    geminiWs.on('error', (error) => {
      console.error('Gemini Live WebSocket error:', error);
      send(ws, {
        type: 'error',
        message: 'Voice connection error',
        code: 'VOICE_ERROR',
      });
    });

    geminiWs.on('close', () => {
      liveSessions.delete(wsKey(ws));
      send(ws, { type: 'status', status: 'idle' });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start voice session';
    console.error('Voice session start error:', error);
    send(ws, { type: 'error', message, code: 'VOICE_START_ERROR' });
  }
}

export function relayAudioChunk(ws: WSContext, base64Audio: string): void {
  const liveSession = liveSessions.get(wsKey(ws));
  if (!liveSession?.isSetup) return;

  liveSession.geminiWs.send(
    JSON.stringify({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Audio,
          },
        ],
      },
    })
  );
}

export function endVoiceAudio(_ws: WSContext): void {
  // The Gemini Live API handles VAD natively,
  // so audio_end from the client is a hint to stop listening.
  // No explicit action needed — the API detects silence.
}

export function stopVoiceSession(ws: WSContext): void {
  const liveSession = liveSessions.get(wsKey(ws));
  if (liveSession) {
    liveSession.geminiWs.close();
    liveSessions.delete(wsKey(ws));
  }
}
