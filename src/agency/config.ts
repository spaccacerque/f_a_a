import fs from 'fs';
import path from 'path';
import type { AgencyConfig, Platform } from './types.ts';
import { ALL_PLATFORMS } from './types.ts';
import { logger } from './logger.ts';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'config.json');

function defaultConfig(): AgencyConfig {
  const platforms = {} as AgencyConfig['platforms'];
  for (const p of ALL_PLATFORMS) {
    platforms[p] = { enabled: true, maxPostsPerDay: 6 };
  }
  return {
    brand: {
      name: 'Agenzia Social Autonoma',
      mission:
        'Informare e far crescere la comunità online con contenuti curati, utili e verificati, selezionati dalle migliori fonti.',
      tone: 'professionale ma accessibile, positivo, concreto',
      language: 'italiano',
      audience: 'comunità online interessata ai temi delle fonti configurate',
    },
    autoPublish: true,
    qualityThreshold: 7,
    intervals: {
      ingestMinutes: 15,
      generateMinutes: 5,
      publishMinutes: 3,
      retroHours: 6,
    },
    platforms,
    goals: [
      {
        id: 'g-quality',
        metric: 'avg_quality',
        target: 8,
        direction: 'gte',
        description: 'Qualità media dei post pubblicati di almeno 8/10',
      },
      {
        id: 'g-cadence',
        metric: 'posts_per_day',
        target: 3,
        direction: 'gte',
        description: 'Almeno 3 post pubblicati al giorno',
      },
      {
        id: 'g-approval',
        metric: 'approval_rate',
        target: 70,
        direction: 'gte',
        description: 'Almeno il 70% delle bozze supera la soglia di qualità al primo tentativo',
      },
      {
        id: 'g-freshness',
        metric: 'source_freshness',
        target: 90,
        direction: 'gte',
        description: 'Almeno il 90% delle fonti aggiornate senza errori',
      },
      {
        id: 'g-errors',
        metric: 'error_rate',
        target: 5,
        direction: 'lte',
        description: 'Meno del 5% di pubblicazioni fallite',
      },
    ],
  };
}

let config: AgencyConfig = defaultConfig();

export function loadConfig(): AgencyConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      config = { ...defaultConfig(), ...saved, platforms: { ...defaultConfig().platforms, ...saved.platforms } };
    }
  } catch (e: any) {
    logger.error('config', `Configurazione non leggibile, uso i default: ${e.message}`);
  }
  return config;
}

export function getConfig(): AgencyConfig {
  return config;
}

export function updateConfig(patch: Partial<AgencyConfig>): AgencyConfig {
  config = {
    ...config,
    ...patch,
    brand: { ...config.brand, ...(patch.brand ?? {}) },
    intervals: { ...config.intervals, ...(patch.intervals ?? {}) },
    platforms: { ...config.platforms, ...(patch.platforms ?? {}) },
    goals: patch.goals ?? config.goals,
  };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  return config;
}

// Credenziali delle piattaforme: solo da variabili d'ambiente, mai salvate su disco.
export function platformCredentials(platform: Platform): Record<string, string | undefined> {
  const env = process.env;
  switch (platform) {
    case 'telegram':
      return { botToken: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID };
    case 'mastodon':
      return { baseUrl: env.MASTODON_BASE_URL, accessToken: env.MASTODON_ACCESS_TOKEN };
    case 'twitter':
      return {
        apiKey: env.TWITTER_API_KEY,
        apiSecret: env.TWITTER_API_SECRET,
        accessToken: env.TWITTER_ACCESS_TOKEN,
        accessSecret: env.TWITTER_ACCESS_SECRET,
      };
    case 'facebook':
      return { pageId: env.FACEBOOK_PAGE_ID, pageToken: env.FACEBOOK_PAGE_TOKEN };
    case 'instagram':
      return { accountId: env.INSTAGRAM_ACCOUNT_ID, accessToken: env.INSTAGRAM_ACCESS_TOKEN };
    case 'linkedin':
      return { accessToken: env.LINKEDIN_ACCESS_TOKEN, authorUrn: env.LINKEDIN_AUTHOR_URN };
  }
}

export function platformConfigured(platform: Platform): boolean {
  const creds = platformCredentials(platform);
  return Object.values(creds).every((v) => typeof v === 'string' && v.length > 0);
}
