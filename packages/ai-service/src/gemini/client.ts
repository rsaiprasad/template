import {
  type ChatSession,
  type Content,
  type FunctionDeclaration,
  type GenerativeModel,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import { config } from '../config/index.js';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

export function createChatSession(
  systemPrompt: string,
  tools: FunctionDeclaration[],
  history: Content[]
): ChatSession {
  const ai = getGenAI();

  const model: GenerativeModel = ai.getGenerativeModel({
    model: config.gemini.model,
    systemInstruction: systemPrompt,
    tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
  });

  return model.startChat({
    history,
  });
}
