import type { GoalEvaluation } from './types.ts';
import { getConfig } from './config.ts';
import { getDb } from './store.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Calcola lo stato attuale di ogni obiettivo sui dati delle ultime 24 ore
// (qualità e approvazione: ultimi 7 giorni per avere un campione più stabile).
export function evaluateGoals(): GoalEvaluation[] {
  const { goals, qualityThreshold } = getConfig();
  const db = getDb();
  const now = Date.now();
  const last24h = (ts?: string) => ts !== undefined && now - Date.parse(ts) < DAY_MS;
  const last7d = (ts?: string) => ts !== undefined && now - Date.parse(ts) < 7 * DAY_MS;

  const publishedToday = db.posts.filter(
    (p) => (p.status === 'published' || p.status === 'simulated') && last24h(p.publishedAt),
  );
  const scoredWeek = db.posts.filter((p) => last7d(p.createdAt) && typeof p.qualityScore === 'number');
  const attemptsToday = db.posts.filter(
    (p) => (p.status === 'published' || p.status === 'simulated' || p.status === 'failed') && last24h(p.publishedAt ?? p.createdAt),
  );
  const failedToday = attemptsToday.filter((p) => p.status === 'failed');
  const enabledSources = db.sources.filter((s) => s.enabled);
  const freshSources = enabledSources.filter((s) => s.lastFetchedAt && !s.lastError);

  return goals.map((goal) => {
    let current = 0;
    switch (goal.metric) {
      case 'avg_quality': {
        const published = db.posts.filter(
          (p) => (p.status === 'published' || p.status === 'simulated') && typeof p.qualityScore === 'number' && last7d(p.publishedAt),
        );
        current = published.length
          ? round1(published.reduce((sum, p) => sum + (p.qualityScore ?? 0), 0) / published.length)
          : 0;
        break;
      }
      case 'posts_per_day':
        current = publishedToday.length;
        break;
      case 'approval_rate':
        current = scoredWeek.length
          ? round1((scoredWeek.filter((p) => (p.qualityScore ?? 0) >= qualityThreshold && p.revision === 0).length / scoredWeek.length) * 100)
          : 0;
        break;
      case 'source_freshness':
        current = enabledSources.length ? round1((freshSources.length / enabledSources.length) * 100) : 100;
        break;
      case 'error_rate':
        current = attemptsToday.length ? round1((failedToday.length / attemptsToday.length) * 100) : 0;
        break;
    }
    const achieved = goal.direction === 'gte' ? current >= goal.target : current <= goal.target;
    return { goal, current, achieved };
  });
}
