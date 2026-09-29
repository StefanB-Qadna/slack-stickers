import { helpBlocks, noMatchBlocks, previewBlocks } from "../../lib/blocks.js";
import { pickerView } from "../../lib/picker.js";
import { findMatches } from "../../lib/search.js";
import { callSlack, loadCustomEmoji, normalizeQuery, readVerifiedBody } from "../../lib/slack.js";

export async function POST(request: Request): Promise<Response> {
  const body = await readVerifiedBody(request);
  if (body === null) return new Response("invalid signature", { status: 401 });

  const params = new URLSearchParams(body);
  const query = normalizeQuery(params.get("text"));
  const emoji = await loadCustomEmoji();

  if (emoji.size === 0) {
    return Response.json({
      response_type: "ephemeral",
      text: "This workspace has no custom emoji yet. Add some from the emoji picker with *Add Emoji*, then try again.",
    });
  }

  if (query === "help") {
    return Response.json({ response_type: "ephemeral", text: "How to use /sticker", blocks: helpBlocks(emoji.size) });
  }

  if (query === "") {
    await callSlack("views.open", {
      trigger_id: params.get("trigger_id"),
      view: pickerView({ responseUrl: params.get("response_url") ?? "", query: "", page: 0 }, emoji),
    });
    return new Response(null, { status: 200 });
  }

  const random = query === "random";
  const matches = findMatches(random ? "" : query, [...emoji.keys()]);

  if (matches.length === 0) {
    return Response.json({ response_type: "ephemeral", text: `No match for "${query}"`, blocks: noMatchBlocks(query) });
  }

  const index = random ? Math.floor(Math.random() * matches.length) : 0;
  const name = matches[index];
  return Response.json({
    response_type: "ephemeral",
    text: `Sticker preview: :${name}:`,
    blocks: previewBlocks(name, emoji.get(name)!, { query: random ? "" : query, index }, matches.length),
  });
}
