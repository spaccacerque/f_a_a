import type { ContentItem, GoalEvaluation, Platform, PostDraft } from '../types.ts';
import { getConfig } from '../config.ts';
import { readPlaybook, writePlaybook } from '../store.ts';
import { aiAvailable, generateJson, generateText } from './gemini.ts';
import { logger } from '../logger.ts';

interface Review {
  score: number;
  critique: string;
}

// Valuta una bozza prima della pubblicazione: punteggio 1-10 + critica operativa.
export async function reviewPost(
  item: ContentItem,
  platform: Platform,
  text: string,
): Promise<Review> {
  if (!aiAvailable()) {
    // Senza AI non possiamo valutare: punteggio neutro sotto soglia di default,
    // così i post finiscono in coda di approvazione manuale invece di uscire alla cieca.
    return { score: 6, critique: 'Revisione AI non disponibile (GEMINI_API_KEY assente): richiesta approvazione manuale.' };
  }
  const cfg = getConfig();
  const prompt = `Sei il direttore qualità di un'agenzia social. Valuta questo post destinato a ${platform}.

Post:
${text}

Fonte di origine: "${item.title}" (${item.link})
Riassunto fonte: ${item.summary || '(non disponibile)'}

Criteri (peso uguale): aderenza ai fatti della fonte, aggancio iniziale, valore aggiunto per il lettore,
adeguatezza alla piattaforma e al tono "${cfg.brand.tone}", call-to-action, hashtag pertinenti.
Sii severo: 9-10 solo per post eccellenti.

Rispondi SOLO con JSON: {"score": <1-10>, "critique": "<critica concreta in 1-3 frasi, in italiano>"}`;
  const out = await generateJson<Review>(prompt);
  if (!out || typeof out.score !== 'number') {
    return { score: 6, critique: 'Valutazione AI non riuscita: richiesta approvazione manuale.' };
  }
  return { score: Math.max(1, Math.min(10, Math.round(out.score))), critique: out.critique ?? '' };
}

// Ciclo di auto-miglioramento: analizza le prestazioni recenti rispetto agli
// obiettivi e riscrive il playbook editoriale che guida le generazioni future.
export async function runRetrospective(
  recentPosts: PostDraft[],
  evaluations: GoalEvaluation[],
): Promise<{ analysis: string; playbookUpdated: boolean }> {
  if (!aiAvailable()) {
    return {
      analysis: 'Retrospettiva saltata: AI non disponibile (GEMINI_API_KEY assente).',
      playbookUpdated: false,
    };
  }
  const cfg = getConfig();
  const playbook = readPlaybook();

  const goalLines = evaluations
    .map((e) => `- ${e.goal.description}: attuale ${e.current} / target ${e.goal.target} → ${e.achieved ? 'RAGGIUNTO' : 'NON raggiunto'}`)
    .join('\n');

  const best = [...recentPosts].sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0)).slice(0, 3);
  const worst = [...recentPosts].sort((a, b) => (a.qualityScore ?? 0) - (b.qualityScore ?? 0)).slice(0, 3);
  const sample = (p: PostDraft) =>
    `  [${p.platform}, voto ${p.qualityScore ?? '?'}] ${p.text.slice(0, 200).replace(/\n/g, ' ')}`;

  const prompt = `Sei il direttore strategico di "${cfg.brand.name}". È il momento della retrospettiva periodica.

OBIETTIVI E STATO ATTUALE:
${goalLines || '- (nessun obiettivo configurato)'}

POST MIGLIORI del periodo:
${best.map(sample).join('\n') || '  (nessuno)'}

POST PEGGIORI del periodo:
${worst.map(sample).join('\n') || '  (nessuno)'}

PLAYBOOK ATTUALE:
${playbook}

Compiti:
1. Analizza cosa funziona e cosa no, con particolare attenzione agli obiettivi NON raggiunti.
2. Riscrivi il playbook migliorandolo: conserva le regole che funzionano, correggi o sostituisci
   quelle che non danno risultati, aggiungi 1-3 regole nuove e concrete ricavate dai dati.
   Il playbook deve restare sotto le 40 righe, in markdown, in italiano.

Rispondi SOLO con JSON: {"analysis": "<analisi sintetica in 3-6 frasi>", "playbook": "<nuovo playbook completo in markdown>"}`;

  const out = await generateJson<{ analysis: string; playbook: string }>(prompt);
  if (!out?.playbook || out.playbook.length < 100) {
    const analysis = out?.analysis ?? (await safeAnalysisFallback(goalLines));
    return { analysis, playbookUpdated: false };
  }
  writePlaybook(out.playbook.trim() + '\n');
  logger.info('retro', 'Playbook editoriale aggiornato dal ciclo di auto-miglioramento');
  return { analysis: out.analysis ?? 'Playbook aggiornato.', playbookUpdated: true };
}

async function safeAnalysisFallback(goalLines: string): Promise<string> {
  try {
    return await generateText(
      `Analizza in 3 frasi (italiano) lo stato di questi obiettivi di un'agenzia social:\n${goalLines}`,
    );
  } catch {
    return 'Analisi non disponibile in questo ciclo.';
  }
}
