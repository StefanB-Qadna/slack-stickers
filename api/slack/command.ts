import { helpBlocks, previewBlocks } from "../../lib/blocks.js";
import { findMatches, loadCustomEmoji, normalizeQuery, readVerifiedBody } from "../../lib/slack.js";

export async function POST(request: Request): Promise<Response> {
  const body = await readVerifiedBody(request);
  if (body === null) return new Response("invalid signature", { status: 401 });

  const query = normalizeQuery(new URLSearchParams(body).get("text"));
  const emoji = await loadCustomEmoji();

  if (query === "help") {
    return Response.json({ response_type: "ephemeral", text: "How to use /sticker", blocks: helpBlocks(emoji.size) });
  }

  const matches = findMatches(query, [...emoji.keys()]);

  if (matches.length === 0) {
    return Response.json({
      response_type: "ephemeral",
      text: query
        ? `No custom emoji name contains "${query}". Try a shorter search, run \`/sticker\` for a random one, or \`/sticker help\` for tips.`
        : "This workspace has no custom emoji yet. Add some from the emoji picker with *Add Emoji*, then try again.",
    });
  }

  const index = query ? 0 : Math.floor(Math.random() * matches.length);
  const name = matches[index];
  return Response.json({
    response_type: "ephemeral",
    text: `Sticker preview: :${name}:`,
    blocks: previewBlocks(name, emoji.get(name)!, { query, index }, matches.length),
  });
}
