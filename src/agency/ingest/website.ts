import type { ContentItem, Source } from '../types.ts';
import { fetchFeedItems } from './rss.ts';
import { hashLink } from '../store.ts';

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; AgenziaSocialAutonoma/1.0)' };

// Cache: URL sito -> URL feed scoperto via autodiscovery (o '' se assente).
const discoveredFeeds = new Map<string, string>();

function absolutize(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Strategia: 1) cerca un feed RSS/Atom dichiarato nella pagina (autodiscovery);
// 2) in mancanza, estrae i link "ad articolo" dalla pagina con euristiche.
export async function fetchWebsiteItems(source: Source): Promise<ContentItem[]> {
  const known = discoveredFeeds.get(source.url);
  if (known) return fetchFeedItems(source, known);

  const res = await fetch(source.url, { headers: UA });
  if (!res.ok) throw new Error(`Sito non raggiungibile (HTTP ${res.status})`);
  const html = await res.text();

  if (known === undefined) {
    const feedMatch = html.match(
      /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i,
    );
    const href = feedMatch?.[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (href) {
      const feedUrl = absolutize(href, source.url);
      try {
        const items = await fetchFeedItems(source, feedUrl);
        discoveredFeeds.set(source.url, feedUrl);
        return items;
      } catch {
        // Il feed dichiarato non funziona: si procede con l'estrazione dei link.
      }
    }
    discoveredFeeds.set(source.url, '');
  }

  // Fallback: link interni con testo "da titolo" (sufficientemente lungo).
  const base = new URL(source.url);
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const items: ContentItem[] = [];
  const anchorRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null && items.length < 15) {
    const link = absolutize(m[1], source.url);
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, ' '));
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      continue;
    }
    if (url.host !== base.host) continue;
    if (text.length < 35 || text.length > 250) continue;
    if (seen.has(link)) continue;
    seen.add(link);
    items.push({
      id: hashLink(link),
      sourceId: source.id,
      sourceName: source.name,
      title: text.slice(0, 300),
      link,
      summary: '',
      fetchedAt: now,
      status: 'new',
    });
  }
  return items;
}
