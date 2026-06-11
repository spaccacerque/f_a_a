import type { ContentItem } from '../types.ts';
import { getConfig } from '../config.ts';
import { aiAvailable, generateJson } from './gemini.ts';

export interface RelevanceResult {
  relevant: boolean;
  score: number;
  reason: string;
}

// Decide se un contenuto rientra negli interessi configurati dall'utente.
// Con AI: valutazione semantica con punteggio 0-10 contro la soglia.
// Senza AI: confronto per parole chiave ricavate dal campo interessi.
export async function checkRelevance(item: ContentItem): Promise<RelevanceResult> {
  const cfg = getConfig();
  const interests = cfg.interests.trim();
  if (!interests) {
    return { relevant: true, score: 10, reason: 'Nessun filtro interessi configurato' };
  }

  if (!aiAvailable()) {
    return keywordRelevance(item, interests);
  }

  const prompt = `Sei il curatore editoriale di un'agenzia social. L'editore pubblica SOLO contenuti su questi temi:
"${interests}"

Valuta questo contenuto:
- Titolo: ${item.title}
- Fonte: ${item.sourceName}
- Riassunto: ${item.summary || '(non disponibile)'}

Quanto è pertinente rispetto ai temi dell'editore? Sii rigoroso: contenuti fuori tema o solo
vagamente collegati devono avere un punteggio basso.

Rispondi SOLO con JSON: {"score": <0-10>, "reason": "<motivazione in una frase, in italiano>"}`;

  const out = await generateJson<{ score: number; reason: string }>(prompt);
  if (!out || typeof out.score !== 'number') {
    // In dubbio non si scarta: finirà comunque in revisione manuale.
    return { relevant: true, score: cfg.relevanceThreshold, reason: 'Valutazione AI non riuscita: contenuto mantenuto per revisione' };
  }
  const score = Math.max(0, Math.min(10, Math.round(out.score)));
  return { relevant: score >= cfg.relevanceThreshold, score, reason: out.reason ?? '' };
}

function keywordRelevance(item: ContentItem, interests: string): RelevanceResult {
  const keywords = interests
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 2);
  if (keywords.length === 0) return { relevant: true, score: 10, reason: 'Filtro interessi vuoto' };
  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  const hits = keywords.filter((k) => haystack.includes(k));
  const relevant = hits.length > 0;
  return {
    relevant,
    score: relevant ? 8 : 2,
    reason: relevant
      ? `Corrispondenza parole chiave: ${hits.slice(0, 3).join(', ')}`
      : 'Nessuna corrispondenza con le parole chiave degli interessi (AI non disponibile)',
  };
}
