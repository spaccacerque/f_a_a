import type { ContentItem, EditorialPhase, Platform, PostDraft, Source } from './types.ts';
import { ALL_PLATFORMS } from './types.ts';
import { getConfig } from './config.ts';
import { getDb, newId, saveStore } from './store.ts';
import { logger } from './logger.ts';
import { fetchFeedItems } from './ingest/rss.ts';
import { fetchYouTubeItems } from './ingest/youtube.ts';
import { fetchWebsiteItems } from './ingest/website.ts';
import { writePost, revisePost } from './ai/writer.ts';
import { reviewPost, runRetrospective } from './ai/critic.ts';
import { checkRelevance } from './ai/curator.ts';
import { publish } from './publish/publisher.ts';
import { evaluateGoals } from './goals.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const ITEMS_PER_GENERATE_CYCLE = 3;

export type TaskName = 'ingest' | 'generate' | 'publish' | 'retro';

interface TaskState {
  lastRunAt?: string;
  lastDurationMs?: number;
  running: boolean;
}

const timers = new Map<TaskName, NodeJS.Timeout>();
const taskState: Record<TaskName, TaskState> = {
  ingest: { running: false },
  generate: { running: false },
  publish: { running: false },
  retro: { running: false },
};
let engineRunning = false;
let startedAt: string | null = null;

// ---------------------------------------------------------------- ingestione

async function fetchSource(source: Source): Promise<ContentItem[]> {
  switch (source.type) {
    case 'rss':
      return fetchFeedItems(source);
    case 'youtube':
      return fetchYouTubeItems(source);
    case 'website':
      return fetchWebsiteItems(source);
  }
}

export async function runIngest(): Promise<number> {
  const db = getDb();
  const known = new Set(db.items.map((i) => i.id));
  let added = 0;
  for (const source of db.sources.filter((s) => s.enabled)) {
    try {
      const items = await fetchSource(source);
      for (const item of items) {
        if (known.has(item.id)) continue;
        known.add(item.id);
        db.items.push(item);
        added++;
      }
      source.lastFetchedAt = new Date().toISOString();
      source.lastError = undefined;
    } catch (e: any) {
      source.lastError = e.message;
      logger.warn('ingest', `Fonte "${source.name}" in errore: ${e.message}`);
    }
  }
  if (added > 0) logger.info('ingest', `${added} nuovi contenuti raccolti dalle fonti`);
  saveStore();
  return added;
}

// -------------------------------------------------------------- generazione

async function draftForPlatform(item: ContentItem, platform: Platform): Promise<PostDraft> {
  const cfg = getConfig();
  let text = await writePost(item, platform);
  let review = await reviewPost(item, platform, text);
  let revision = 0;

  // Un giro di revisione automatica se la qualità è sotto soglia.
  if (review.score < cfg.qualityThreshold) {
    const improved = await revisePost(item, platform, text, review.critique);
    if (improved !== text) {
      const secondReview = await reviewPost(item, platform, improved);
      if (secondReview.score > review.score) {
        text = improved;
        review = secondReview;
        revision = 1;
      }
    }
  }

  const passes = review.score >= cfg.qualityThreshold;
  return {
    id: newId(),
    itemId: item.id,
    itemTitle: item.title,
    itemLink: item.link,
    platform,
    text,
    imageUrl: item.imageUrl,
    qualityScore: review.score,
    critique: review.critique,
    revision,
    status: cfg.autoPublish && passes ? 'approved' : 'draft',
    createdAt: new Date().toISOString(),
    scheduledAt: cfg.autoPublish && passes ? nextSlot(platform) : undefined,
  };
}

// Distanzia i post sulla stessa piattaforma per coprire la giornata
// invece di pubblicare a raffica.
function nextSlot(platform: Platform): string {
  const cfg = getConfig();
  const spacingMs = Math.floor((20 * 60 * 60 * 1000) / Math.max(1, cfg.platforms[platform].maxPostsPerDay));
  const db = getDb();
  const lastForPlatform = db.posts
    .filter((p) => p.platform === platform && (p.status === 'approved' || p.status === 'published' || p.status === 'simulated'))
    .map((p) => Date.parse(p.scheduledAt ?? p.publishedAt ?? p.createdAt))
    .reduce((max, t) => Math.max(max, t), 0);
  const slot = Math.max(Date.now(), lastForPlatform + spacingMs);
  return new Date(slot).toISOString();
}

// Fase editoriale: "backfill" finché non si raggiunge il target di articoli
// (default 100), poi "fresh" (solo contenuti recenti).
export function currentPhase(): EditorialPhase {
  const cfg = getConfig();
  return getDb().stats.articlesTotal >= cfg.editorial.backfillTargetArticles ? 'fresh' : 'backfill';
}

export function editorialProgress() {
  const cfg = getConfig();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  return {
    phase: currentPhase(),
    articlesTotal: db.stats.articlesTotal,
    backfillTarget: cfg.editorial.backfillTargetArticles,
    articlesToday: db.stats.byDay[today] ?? 0,
    dailyQuota: cfg.editorial.articlesPerDay,
  };
}

function itemDate(item: ContentItem): number {
  return Date.parse(item.publishedAt ?? item.fetchedAt);
}

// Seleziona i prossimi contenuti da lavorare secondo la fase:
// - backfill: dal più VECCHIO (entro la finestra di N mesi) in avanti,
//   per costruire lo storico del canale in ordine cronologico;
// - fresh: solo contenuti con età massima consentita, dal più vecchio
//   dei recenti in avanti (quelli troppo vecchi vengono scartati).
function selectItems(limit: number): ContentItem[] {
  const cfg = getConfig();
  const db = getDb();
  const now = Date.now();
  const fresh = db.items.filter((i) => i.status === 'new');

  if (currentPhase() === 'backfill') {
    const start = new Date();
    start.setMonth(start.getMonth() - cfg.editorial.backfillMonthsAgo);
    const windowStart = start.getTime();
    const selectable: ContentItem[] = [];
    for (const item of fresh) {
      if (itemDate(item) < windowStart) {
        item.status = 'discarded';
        item.discardReason = `Più vecchio della finestra storico (${cfg.editorial.backfillMonthsAgo} mesi)`;
      } else {
        selectable.push(item);
      }
    }
    return selectable.sort((a, b) => itemDate(a) - itemDate(b)).slice(0, limit);
  }

  const maxAgeMs = cfg.editorial.freshMaxAgeDays * DAY_MS;
  const selectable: ContentItem[] = [];
  for (const item of fresh) {
    if (now - itemDate(item) > maxAgeMs) {
      item.status = 'discarded';
      item.discardReason = `Più vecchio di ${cfg.editorial.freshMaxAgeDays} giorni (fase attualità)`;
    } else {
      selectable.push(item);
    }
  }
  return selectable.sort((a, b) => itemDate(a) - itemDate(b)).slice(0, limit);
}

export async function runGenerate(): Promise<number> {
  const cfg = getConfig();
  const db = getDb();
  const enabledPlatforms = ALL_PLATFORMS.filter((p) => cfg.platforms[p].enabled);
  if (enabledPlatforms.length === 0) return 0;

  // Quota giornaliera: non più di articlesPerDay articoli lavorati al giorno.
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = db.stats.byDay[today] ?? 0;
  const remainingToday = cfg.editorial.articlesPerDay - doneToday;
  if (remainingToday <= 0) return 0;

  const pending = selectItems(Math.min(ITEMS_PER_GENERATE_CYCLE, remainingToday));

  let created = 0;
  for (const item of pending) {
    // Filtro pertinenza: lavora solo i contenuti in linea con gli interessi configurati.
    try {
      const relevance = await checkRelevance(item);
      item.relevanceScore = relevance.score;
      if (!relevance.relevant) {
        item.status = 'discarded';
        item.discardReason = relevance.reason;
        logger.info('curator', `Scartato (pertinenza ${relevance.score}/10): "${item.title.slice(0, 60)}" — ${relevance.reason}`);
        continue;
      }
    } catch (e: any) {
      logger.warn('curator', `Verifica pertinenza fallita per "${item.title.slice(0, 60)}": ${e.message}`);
    }

    for (const platform of enabledPlatforms) {
      try {
        const draft = await draftForPlatform(item, platform);
        db.posts.push(draft);
        created++;
        logger.info(
          'generate',
          `Bozza ${platform} per "${item.title.slice(0, 60)}" → voto ${draft.qualityScore}/10, stato: ${draft.status}`,
        );
      } catch (e: any) {
        logger.error('generate', `Generazione fallita (${platform}, "${item.title.slice(0, 60)}"): ${e.message}`);
      }
    }
    item.status = 'drafted';
    item.draftedAt = new Date().toISOString();
    db.stats.articlesTotal++;
    db.stats.byDay[today] = (db.stats.byDay[today] ?? 0) + 1;

    if (db.stats.articlesTotal === cfg.editorial.backfillTargetArticles) {
      logger.info(
        'engine',
        `Traguardo storico raggiunto (${db.stats.articlesTotal} articoli): da ora fase ATTUALITÀ, solo contenuti con età massima ${cfg.editorial.freshMaxAgeDays} giorni`,
      );
    }
  }
  saveStore();
  return created;
}

// ------------------------------------------------------------- pubblicazione

export async function runPublish(): Promise<number> {
  const cfg = getConfig();
  const db = getDb();
  const now = Date.now();
  let publishedCount = 0;

  for (const platform of ALL_PLATFORMS) {
    if (!cfg.platforms[platform].enabled) continue;
    const publishedToday = db.posts.filter(
      (p) =>
        p.platform === platform &&
        (p.status === 'published' || p.status === 'simulated') &&
        p.publishedAt !== undefined &&
        now - Date.parse(p.publishedAt) < DAY_MS,
    ).length;
    let budget = cfg.platforms[platform].maxPostsPerDay - publishedToday;
    if (budget <= 0) continue;

    const due = db.posts
      .filter((p) => p.platform === platform && p.status === 'approved' && (!p.scheduledAt || Date.parse(p.scheduledAt) <= now))
      .sort((a, b) => Date.parse(a.scheduledAt ?? a.createdAt) - Date.parse(b.scheduledAt ?? b.createdAt));

    for (const post of due) {
      if (budget <= 0) break;
      const result = await publish(post);
      if (result.ok) {
        post.status = result.simulated ? 'simulated' : 'published';
        post.publishedAt = new Date().toISOString();
        post.externalId = result.externalId;
        publishedCount++;
        budget--;
      } else {
        post.status = 'failed';
        post.error = result.error;
      }
    }
  }
  if (publishedCount > 0) saveStore();
  return publishedCount;
}

// --------------------------------------------- retrospettiva (miglioramento)

export async function runRetro(): Promise<void> {
  const db = getDb();
  const evaluations = evaluateGoals();
  const recent = db.posts.filter((p) => Date.now() - Date.parse(p.createdAt) < DAY_MS && typeof p.qualityScore === 'number');
  const { analysis, playbookUpdated } = await runRetrospective(recent, evaluations);
  db.retros.push({ ts: new Date().toISOString(), goalEvaluations: evaluations, analysis, playbookUpdated });
  const achieved = evaluations.filter((e) => e.achieved).length;
  logger.info('retro', `Retrospettiva completata: ${achieved}/${evaluations.length} obiettivi raggiunti. ${playbookUpdated ? 'Playbook aggiornato.' : 'Playbook invariato.'}`);
  saveStore();
}

// ------------------------------------------------------------------- motore

const TASKS: Record<TaskName, () => Promise<unknown>> = {
  ingest: runIngest,
  generate: runGenerate,
  publish: runPublish,
  retro: runRetro,
};

function intervalMs(task: TaskName): number {
  const { intervals } = getConfig();
  switch (task) {
    case 'ingest':
      return intervals.ingestMinutes * 60_000;
    case 'generate':
      return intervals.generateMinutes * 60_000;
    case 'publish':
      return intervals.publishMinutes * 60_000;
    case 'retro':
      return intervals.retroHours * 3_600_000;
  }
}

export async function runTask(task: TaskName): Promise<void> {
  const state = taskState[task];
  if (state.running) return;
  state.running = true;
  const t0 = Date.now();
  try {
    await TASKS[task]();
  } catch (e: any) {
    logger.error('engine', `Ciclo "${task}" in errore: ${e.message}`);
  } finally {
    state.running = false;
    state.lastRunAt = new Date().toISOString();
    state.lastDurationMs = Date.now() - t0;
  }
}

function scheduleLoop(task: TaskName, immediate: boolean) {
  const tick = async () => {
    if (!engineRunning) return;
    await runTask(task);
    if (!engineRunning) return;
    timers.set(task, setTimeout(tick, intervalMs(task)));
  };
  timers.set(task, setTimeout(tick, immediate ? 2000 : intervalMs(task)));
}

export function startEngine() {
  if (engineRunning) return;
  engineRunning = true;
  startedAt = new Date().toISOString();
  scheduleLoop('ingest', true);
  scheduleLoop('generate', true);
  scheduleLoop('publish', true);
  scheduleLoop('retro', false);
  logger.info('engine', 'Motore avviato: cicli ingestione/generazione/pubblicazione/retrospettiva attivi 24/7');
}

export function stopEngine() {
  engineRunning = false;
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  logger.info('engine', 'Motore fermato');
}

export function engineStatus() {
  return {
    running: engineRunning,
    startedAt,
    tasks: taskState,
  };
}
