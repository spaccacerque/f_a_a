import type { Platform, PostDraft, PublishResult } from '../types.ts';
import { platformConfigured } from '../config.ts';
import { logger } from '../logger.ts';
import { publishTelegram } from './platforms/telegram.ts';
import { publishMastodon } from './platforms/mastodon.ts';
import { publishTwitter } from './platforms/twitter.ts';
import { publishFacebook } from './platforms/facebook.ts';
import { publishInstagram } from './platforms/instagram.ts';
import { publishLinkedIn } from './platforms/linkedin.ts';

type PublishFn = (post: PostDraft) => Promise<PublishResult>;

const adapters: Record<Platform, PublishFn> = {
  telegram: publishTelegram,
  mastodon: publishMastodon,
  twitter: publishTwitter,
  facebook: publishFacebook,
  instagram: publishInstagram,
  linkedin: publishLinkedIn,
};

// Pubblica il post sulla piattaforma di destinazione. Se mancano le credenziali
// la pubblicazione è simulata: il flusso resta completo e verificabile, e basta
// aggiungere le chiavi in .env per passare alla pubblicazione reale.
export async function publish(post: PostDraft): Promise<PublishResult> {
  if (!platformConfigured(post.platform)) {
    logger.info('publish', `[SIMULAZIONE] ${post.platform}: "${post.text.slice(0, 80).replace(/\n/g, ' ')}..."`);
    return { ok: true, simulated: true, externalId: `sim-${post.id}` };
  }
  try {
    const result = await adapters[post.platform](post);
    if (result.ok) {
      logger.info('publish', `Pubblicato su ${post.platform} (id ${result.externalId ?? 'n/d'})`);
    } else {
      logger.error('publish', `Pubblicazione fallita su ${post.platform}: ${result.error}`);
    }
    return result;
  } catch (e: any) {
    logger.error('publish', `Errore su ${post.platform}: ${e.message}`);
    return { ok: false, simulated: false, error: e.message };
  }
}
