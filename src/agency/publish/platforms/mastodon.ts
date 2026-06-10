import type { PostDraft, PublishResult } from '../../types.ts';
import { platformCredentials } from '../../config.ts';

export async function publishMastodon(post: PostDraft): Promise<PublishResult> {
  const { baseUrl, accessToken } = platformCredentials('mastodon');
  const res = await fetch(`${baseUrl!.replace(/\/$/, '')}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Idempotency-Key': post.id,
    },
    body: JSON.stringify({ status: post.text, visibility: 'public' }),
  });
  const data: any = await res.json();
  if (!res.ok) return { ok: false, simulated: false, error: data.error ?? `HTTP ${res.status}` };
  return { ok: true, simulated: false, externalId: data.id };
}
