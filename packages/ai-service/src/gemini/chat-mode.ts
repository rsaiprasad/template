import type { Part } from '@google/generative-ai';
import type { WSContext } from 'hono/ws';
import { config } from '../config/index.js';
import { filterContent } from '../guardrails/content-filter.js';
import { buildSystemPrompt } from '../guardrails/system-prompt.js';
import { executeTool } from '../tools/tool-executor.js';
import { getToolsForUser } from '../tools/tool-registry.js';
import type { ServerMessage } from '../ws/message-types.js';
import type { Session } from '../ws/session-manager.js';
import { createChatSession } from './client.js';

function send(ws: WSContext, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

export async function handleTextMessage(
  ws: WSContext,
  session: Session,
  content: string
): Promise<void> {
  // Create an abort controller for this request
  const abortController = new AbortController();
  session.abortController = abortController;

  try {
    send(ws, { type: 'status', status: 'thinking' });

    const tools = getToolsForUser(session.permissions, session.isSuperAdmin);
    const systemPrompt = buildSystemPrompt(session);

    const chatSession = createChatSession(systemPrompt, tools, session.history);

    // Add user message to history
    session.history.push({
      role: 'user',
      parts: [{ text: content }],
    });

    // Send to Gemini
    let result = await chatSession.sendMessage(content);
    let response = result.response;

    // Handle function calling loop
    while (true) {
      if (abortController.signal.aborted) {
        send(ws, { type: 'text', content: 'Response cancelled.', done: true });
        return;
      }

      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      // Execute each function call
      const functionResponses: Part[] = [];
      for (const call of functionCalls) {
        if (abortController.signal.aborted) break;

        send(ws, {
          type: 'tool_call',
          name: call.name,
          status: 'calling',
        });

        try {
          const toolResult = await executeTool(
            call.name,
            call.args as Record<string, unknown>,
            session,
            config.backendUrl
          );

          send(ws, {
            type: 'tool_call',
            name: call.name,
            status: 'done',
            result: toolResult,
          });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: JSON.parse(toolResult),
            },
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Tool execution failed';

          send(ws, {
            type: 'tool_call',
            name: call.name,
            status: 'error',
            result: errorMsg,
          });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { error: errorMsg },
            },
          });
        }
      }

      if (abortController.signal.aborted) {
        send(ws, { type: 'text', content: 'Response cancelled.', done: true });
        return;
      }

      // Send function results back to Gemini
      result = await chatSession.sendMessage(functionResponses);
      response = result.response;
    }

    // Extract text from response parts, deduplicating consecutive identical parts.
    // Gemini can return the same text in multiple parts after function calling.
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const textParts: string[] = [];
    for (const part of parts) {
      if ('text' in part && part.text) {
        textParts.push(part.text);
      }
    }
    const uniqueParts = textParts.filter((p, i) => i === 0 || p !== textParts[i - 1]);
    const text = uniqueParts.join('') || response.text();
    const filteredText = filterContent(text);

    // Add model response to history
    session.history.push({
      role: 'model',
      parts: [{ text: filteredText }],
    });

    session.messageCount++;
    session.lastActivity = Date.now();

    send(ws, { type: 'text', content: filteredText, done: true });
    send(ws, { type: 'status', status: 'idle' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    console.error('Chat error:', error);
    send(ws, { type: 'error', message });
    send(ws, { type: 'status', status: 'idle' });
  } finally {
    session.abortController = null;
  }
}
