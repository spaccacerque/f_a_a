import { GoogleGenAI } from '@google/genai';
import { logger } from '../logger.ts';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

let client: GoogleGenAI | null = null;

export function aiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export async function generateText(prompt: string, system?: string): Promise<string> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: system ? { systemInstruction: system } : undefined,
  });
  return response.text ?? '';
}

// Estrae un oggetto JSON dalla risposta del modello, tollerando testo extra o code fence.
export async function generateJson<T>(prompt: string, system?: string): Promise<T | null> {
  try {
    const raw = await generateText(prompt, system);
    const cleaned = raw.replace(/```(?:json)?/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch (e: any) {
    logger.warn('ai', `Risposta JSON non valida dal modello: ${e.message}`);
    return null;
  }
}
