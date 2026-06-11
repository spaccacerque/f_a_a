import Parser from 'rss-parser';
import type { ContentItem, Source } from '../types.ts';
import { hashLink } from '../store.ts';

// User-agent da browser: molti siti di news (CDN/anti-bot) rifiutano i client generici.
export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': BROWSER_UA, Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8' },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:group', 'mediaGroup'],
      ['media:content', 'mediaContent'],
    ],
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImage(item: any): string | undefined {
  if (item.enclosure?.url && /image|jpg|jpeg|png|webp/i.test(item.enclosure.type ?? item.enclosure.url)) {
    return item.enclosure.url;
  }
  const thumb = item.mediaThumbnail?.$?.url ?? item.mediaGroup?.['media:thumbnail']?.[0]?.$?.url;
  if (thumb) return thumb;
  const content = item.mediaContent?.$?.url;
  if (content && /image|jpg|jpeg|png|webp/i.test(item.mediaContent?.$?.medium ?? content)) return content;
  const match = (item.content ?? item['content:encoded'] ?? '').match(/<img[^>]+src="([^"]+)"/i);
  return match?.[1];
}

export async function fetchFeedItems(source: Source, feedUrl?: string): Promise<ContentItem[]> {
  const feed = await parser.parseURL(feedUrl ?? source.url);
  const now = new Date().toISOString();
  const items: ContentItem[] = [];
  for (const item of feed.items.slice(0, 25)) {
    const link = item.link ?? item.guid;
    if (!link) continue;
    const summary = stripHtml(item.contentSnippet ?? item.content ?? item.summary ?? '').slice(0, 1500);
    items.push({
      id: hashLink(link),
      sourceId: source.id,
      sourceName: source.name,
      title: stripHtml(item.title ?? '(senza titolo)').slice(0, 300),
      link,
      summary,
      imageUrl: extractImage(item),
      publishedAt: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : undefined),
      fetchedAt: now,
      status: 'new',
    });
  }
  return items;
}
