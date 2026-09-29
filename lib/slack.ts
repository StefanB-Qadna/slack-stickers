import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_REQUEST_AGE_SECONDS = 300;
const EMOJI_CACHE_TTL_MS = 5 * 60 * 1000;

let emojiCache: { loadedAt: number; emoji: Map<string, string> } | null = null;

export async function readVerifiedBody(request: Request): Promise<string | null> {
  const body = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!timestamp || !signature || !secret) return null;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_REQUEST_AGE_SECONDS) return null;

  const expected = Buffer.from(
    "v0=" + createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex"),
  );
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return body;
}

export async function loadCustomEmoji(): Promise<Map<string, string>> {
  if (emojiCache && Date.now() - emojiCache.loadedAt < EMOJI_CACHE_TTL_MS) return emojiCache.emoji;

  const response = await fetch("https://slack.com/api/emoji.list", {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  const data = (await response.json()) as { ok: boolean; error?: string; emoji?: Record<string, string> };
  if (!data.ok || !data.emoji) throw new Error(`emoji.list failed: ${data.error ?? response.status}`);

  const emoji = new Map<string, string>();
  for (const [name, value] of Object.entries(data.emoji)) {
    const url = resolveAlias(value, data.emoji);
    if (url) emoji.set(name, url);
  }
  emojiCache = { loadedAt: Date.now(), emoji };
  return emoji;
}

function resolveAlias(value: string, all: Record<string, string>, depth = 0): string | null {
  if (!value.startsWith("alias:")) return value;
  if (depth > 5) return null;
  const target = all[value.slice("alias:".length)];
  return target ? resolveAlias(target, all, depth + 1) : null;
}

export function normalizeQuery(text: string | null): string {
  return (text ?? "").trim().toLowerCase().replace(/^:+|:+$/g, "");
}

export function findMatches(query: string, names: string[]): string[] {
  const sorted = [...names].sort();
  if (!query) return sorted;
  const exact = sorted.filter((name) => name === query);
  const prefix = sorted.filter((name) => name !== query && name.startsWith(query));
  const contains = sorted.filter((name) => !name.startsWith(query) && name.includes(query));
  return [...exact, ...prefix, ...contains];
}

export function stickerImageUrl(emojiUrl: string): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return `https://${host}/api/image?src=${encodeURIComponent(emojiUrl)}`;
}

export async function postToResponseUrl(responseUrl: string, payload: object): Promise<void> {
  const response = await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`response_url failed: ${response.status} ${await response.text()}`);
}
