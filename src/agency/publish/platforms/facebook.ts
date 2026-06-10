import type { PostDraft, PublishResult } from '../../types.ts';
import { platformCredentials } from '../../config.ts';

export async function publishFacebook(post: PostDraft): Promise<PublishResult> {
  const { pageId, pageToken } = platformCredentials('facebook');
  const params = new URLSearchParams({
    message: post.text,
    link: post.itemLink,
    access_token: pageToken!,
  });
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST',
    body: params,
  });
  const data: any = await res.json();
  if (!res.ok || data.error) {
    return { ok: false, simulated: false, error: data.error?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, simulated: false, externalId: data.id };
}
