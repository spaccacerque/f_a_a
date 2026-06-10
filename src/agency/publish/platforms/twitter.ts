import crypto from 'crypto';
import type { PostDraft, PublishResult } from '../../types.ts';
import { platformCredentials } from '../../config.ts';

function pctEncode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// Firma OAuth 1.0a (HMAC-SHA1) richiesta dall'endpoint POST /2/tweets con user context.
function oauth1Header(method: string, url: string): string {
  const { apiKey, apiSecret, accessToken, accessSecret } = platformCredentials('twitter');
  const params: Record<string, string> = {
    oauth_consumer_key: apiKey!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: accessToken!,
    oauth_version: '1.0',
  };
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(params[k])}`)
    .join('&');
  const baseString = [method.toUpperCase(), pctEncode(url), pctEncode(paramString)].join('&');
  const signingKey = `${pctEncode(apiSecret!)}&${pctEncode(accessSecret!)}`;
  params.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  const header = Object.keys(params)
    .sort()
    .map((k) => `${pctEncode(k)}="${pctEncode(params[k])}"`)
    .join(', ');
  return `OAuth ${header}`;
}

export async function publishTwitter(post: PostDraft): Promise<PublishResult> {
  const url = 'https://api.twitter.com/2/tweets';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: oauth1Header('POST', url),
    },
    body: JSON.stringify({ text: post.text.slice(0, 280) }),
  });
  const data: any = await res.json();
  if (!res.ok) {
    return { ok: false, simulated: false, error: data.detail ?? data.title ?? `HTTP ${res.status}` };
  }
  return { ok: true, simulated: false, externalId: data.data?.id };
}
