import type { ContentItem, Source } from '../types.ts';
import { BROWSER_UA, fetchFeedItems } from './rss.ts';

// Cache: URL del canale -> URL del feed RSS risolto.
const feedUrlCache = new Map<string, string>();

// YouTube espone un feed RSS per ogni canale: serve solo il channel ID (UC...).
// Accetta URL canale, handle (@nome), ID diretto o URL feed già pronto.
export async function resolveYouTubeFeedUrl(input: string): Promise<string> {
  const trimmed = input.trim();
  if (trimmed.includes('feeds/videos.xml')) return trimmed;

  const idMatch = trimmed.match(/(UC[0-9A-Za-z_-]{22})/);
  if (idMatch) return `https://www.youtube.com/feeds/videos.xml?channel_id=${idMatch[1]}`;

  const cached = feedUrlCache.get(trimmed);
  if (cached) return cached;

  // Handle o URL personalizzato: scarica la pagina del canale e cerca il channelId.
  let pageUrl = trimmed;
  if (!pageUrl.startsWith('http')) {
    pageUrl = `https://www.youtube.com/${pageUrl.startsWith('@') ? pageUrl : '@' + pageUrl}`;
  }
  const res = await fetch(pageUrl, {
    // SOCS: senza il cookie di consenso i server UE rispondono con la pagina
    // consent.youtube.com, che non contiene il channelId.
    headers: { 'User-Agent': BROWSER_UA, Cookie: 'SOCS=CAI' },
  });
  if (!res.ok) throw new Error(`Pagina canale non raggiungibile (HTTP ${res.status})`);
  const html = await res.text();
  const found =
    html.match(/"channelId":"(UC[0-9A-Za-z_-]{22})"/)?.[1] ??
    html.match(/channel_id=(UC[0-9A-Za-z_-]{22})/)?.[1];
  if (!found) throw new Error('Impossibile ricavare il channel ID dalla pagina del canale');
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${found}`;
  feedUrlCache.set(trimmed, feedUrl);
  return feedUrl;
}

export async function fetchYouTubeItems(source: Source): Promise<ContentItem[]> {
  const feedUrl = await resolveYouTubeFeedUrl(source.url);
  return fetchFeedItems(source, feedUrl);
}
