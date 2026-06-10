import type { ContentItem, Platform } from '../types.ts';
import { getConfig } from '../config.ts';
import { readPlaybook } from '../store.ts';
import { aiAvailable, generateJson } from './gemini.ts';
import { logger } from '../logger.ts';

const PLATFORM_RULES: Record<Platform, string> = {
  telegram: 'Telegram: max 900 caratteri, tono diretto, va bene qualche emoji, includi il link.',
  mastodon: 'Mastodon: max 480 caratteri, tono autentico e da community, includi il link e 2-3 hashtag.',
  twitter: 'X/Twitter: max 270 caratteri TASSATIVO (il link conta ~24), aggancio fortissimo, 1-2 hashtag.',
  facebook: 'Facebook: 2-4 frasi discorsive, invita alla conversazione, includi il link.',
  instagram: 'Instagram: caption coinvolgente max 1500 caratteri, 4-6 hashtag in coda, NON includere il link nel testo (va in bio).',
  linkedin: 'LinkedIn: tono professionale, 3-6 frasi con un insight concreto, includi il link, max 2 hashtag.',
};

interface WriterOutput {
  text: string;
}

export async function writePost(item: ContentItem, platform: Platform): Promise<string> {
  if (!aiAvailable()) {
    return fallbackPost(item, platform);
  }
  const cfg = getConfig();
  const playbook = readPlaybook();
  const system = `Sei il copywriter senior di "${cfg.brand.name}", un'agenzia social.
Missione: ${cfg.brand.mission}
Tono di voce: ${cfg.brand.tone}
Pubblico: ${cfg.brand.audience}
Scrivi SEMPRE in ${cfg.brand.language}.
Segui scrupolosamente questo playbook editoriale (aggiornato di continuo dai cicli di miglioramento):
${playbook}`;

  const prompt = `Scrivi un post per la piattaforma ${platform}.
Regole della piattaforma: ${PLATFORM_RULES[platform]}

Contenuto di origine:
- Titolo: ${item.title}
- Fonte: ${item.sourceName}
- Link: ${item.link}
- Riassunto: ${item.summary || '(non disponibile, basati sul titolo senza inventare dettagli)'}

Rispondi SOLO con JSON nel formato: {"text": "..."}`;

  const out = await generateJson<WriterOutput>(prompt, system);
  if (!out?.text) {
    logger.warn('writer', `Generazione AI fallita per "${item.title}" (${platform}), uso il fallback`);
    return fallbackPost(item, platform);
  }
  return out.text.trim();
}

export async function revisePost(
  item: ContentItem,
  platform: Platform,
  previousText: string,
  critique: string,
): Promise<string> {
  if (!aiAvailable()) return previousText;
  const cfg = getConfig();
  const prompt = `Il seguente post per ${platform} non ha superato il controllo qualità.
Regole della piattaforma: ${PLATFORM_RULES[platform]}

Post originale:
${previousText}

Critica del revisore:
${critique}

Contenuto di origine: "${item.title}" — ${item.link}
Riscrivilo in ${cfg.brand.language} risolvendo TUTTI i punti della critica.
Rispondi SOLO con JSON: {"text": "..."}`;
  const out = await generateJson<WriterOutput>(prompt);
  return out?.text?.trim() || previousText;
}

// Senza chiave API il sistema resta operativo con un template di base.
function fallbackPost(item: ContentItem, platform: Platform): string {
  const tagLine = '#news #aggiornamenti';
  if (platform === 'twitter') {
    return `${item.title.slice(0, 200)}\n${item.link}`;
  }
  if (platform === 'instagram') {
    return `${item.title}\n\n${item.summary.slice(0, 300)}\n\nLink in bio.\n${tagLine}`;
  }
  return `${item.title}\n\n${item.summary.slice(0, 400)}\n\n${item.link}\n${tagLine}`;
}
