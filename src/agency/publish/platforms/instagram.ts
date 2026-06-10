import type { PostDraft, PublishResult } from '../../types.ts';
import { platformCredentials } from '../../config.ts';

// Instagram Graph API: prima si crea un "media container" con immagine e caption,
// poi lo si pubblica. Richiede un'immagine: senza, il post viene saltato.
export async function publishInstagram(post: PostDraft): Promise<PublishResult> {
  const { accountId, accessToken } = platformCredentials('instagram');
  if (!post.imageUrl) {
    return { ok: false, simulated: false, error: 'Instagram richiede un\'immagine e il contenuto di origine non ne ha una' };
  }

  const containerRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media`, {
    method: 'POST',
    body: new URLSearchParams({
      image_url: post.imageUrl,
      caption: post.text,
      access_token: accessToken!,
    }),
  });
  const container: any = await containerRes.json();
  if (!containerRes.ok || container.error) {
    return { ok: false, simulated: false, error: container.error?.message ?? `HTTP ${containerRes.status}` };
  }

  const publishRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: container.id, access_token: accessToken! }),
  });
  const published: any = await publishRes.json();
  if (!publishRes.ok || published.error) {
    return { ok: false, simulated: false, error: published.error?.message ?? `HTTP ${publishRes.status}` };
  }
  return { ok: true, simulated: false, externalId: published.id };
}
