// Tipi condivisi del motore dell'agenzia social.

export type SourceType = 'rss' | 'youtube' | 'website';

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  url: string;
  enabled: boolean;
  tags: string[];
  lastFetchedAt?: string;
  lastError?: string;
}

export type Platform =
  | 'telegram'
  | 'mastodon'
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin';

export const ALL_PLATFORMS: Platform[] = [
  'telegram',
  'mastodon',
  'twitter',
  'facebook',
  'instagram',
  'linkedin',
];

export type ItemStatus = 'new' | 'drafted' | 'discarded';

export interface ContentItem {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  summary: string;
  imageUrl?: string;
  publishedAt?: string;
  fetchedAt: string;
  status: ItemStatus;
}

export type PostStatus =
  | 'draft' // generato, in attesa di approvazione manuale
  | 'approved' // approvato (da AI o umano), in attesa di pubblicazione
  | 'published' // pubblicato realmente sulla piattaforma
  | 'simulated' // "pubblicato" in modalità simulazione (credenziali assenti)
  | 'failed'
  | 'rejected';

export interface PostDraft {
  id: string;
  itemId: string;
  itemTitle: string;
  itemLink: string;
  platform: Platform;
  text: string;
  imageUrl?: string;
  qualityScore?: number;
  critique?: string;
  revision: number;
  status: PostStatus;
  createdAt: string;
  scheduledAt?: string;
  publishedAt?: string;
  externalId?: string;
  error?: string;
}

export type GoalMetric =
  | 'avg_quality' // qualità media dei post (1-10)
  | 'posts_per_day' // post pubblicati al giorno (tutte le piattaforme)
  | 'approval_rate' // % di bozze che superano la soglia di qualità
  | 'source_freshness' // % di fonti aggiornate senza errori
  | 'error_rate'; // % di pubblicazioni fallite (obiettivo: sotto il target)

export interface Goal {
  id: string;
  metric: GoalMetric;
  target: number;
  direction: 'gte' | 'lte';
  description: string;
}

export interface GoalEvaluation {
  goal: Goal;
  current: number;
  achieved: boolean;
}

export interface LogEntry {
  ts: string;
  level: 'info' | 'warn' | 'error';
  scope: string;
  message: string;
}

export interface RetroReport {
  ts: string;
  goalEvaluations: GoalEvaluation[];
  analysis: string;
  playbookUpdated: boolean;
}

export interface PlatformConfig {
  enabled: boolean;
  maxPostsPerDay: number;
}

export interface BrandConfig {
  name: string;
  mission: string;
  tone: string;
  language: string;
  audience: string;
}

export interface EngineIntervals {
  ingestMinutes: number;
  generateMinutes: number;
  publishMinutes: number;
  retroHours: number;
}

export interface AgencyConfig {
  brand: BrandConfig;
  autoPublish: boolean;
  qualityThreshold: number;
  intervals: EngineIntervals;
  platforms: Record<Platform, PlatformConfig>;
  goals: Goal[];
}

export interface PublishResult {
  ok: boolean;
  simulated: boolean;
  externalId?: string;
  error?: string;
}
