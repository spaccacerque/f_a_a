import type { PostDraft, PublishResult } from '../../types.ts';
import { platformCredentials } from '../../config.ts';

export async function publishTelegram(post: PostDraft): Promise<PublishResult> {
  const { botToken, chatId } = platformCredentials('telegram');
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: post.text,
      disable_web_page_preview: false,
    }),
  });
  const data: any = await res.json();
  if (!data.ok) return { ok: false, simulated: false, error: data.description ?? `HTTP ${res.status}` };
  return { ok: true, simulated: false, externalId: String(data.result?.message_id ?? '') };
}
