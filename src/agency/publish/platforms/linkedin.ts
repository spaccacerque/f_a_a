import type { PostDraft, PublishResult } from '../../types.ts';
import { platformCredentials } from '../../config.ts';

export async function publishLinkedIn(post: PostDraft): Promise<PublishResult> {
  const { accessToken, authorUrn } = platformCredentials('linkedin');
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: post.text },
          shareMediaCategory: 'ARTICLE',
          media: [{ status: 'READY', originalUrl: post.itemLink }],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  if (!res.ok) {
    const data: any = await res.json().catch(() => ({}));
    return { ok: false, simulated: false, error: data.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, simulated: false, externalId: res.headers.get('x-restli-id') ?? undefined };
}
