import { previewBlocks, stickerBlocks, type PreviewState } from "../../lib/blocks.js";
import { findMatches, loadCustomEmoji, postToResponseUrl, readVerifiedBody } from "../../lib/slack.js";

type BlockActionPayload = {
  type: string;
  user: { id: string };
  response_url: string;
  actions: { action_id: string; value: string }[];
};

export async function POST(request: Request): Promise<Response> {
  const body = await readVerifiedBody(request);
  if (body === null) return new Response("invalid signature", { status: 401 });

  const payload = JSON.parse(new URLSearchParams(body).get("payload") ?? "{}") as BlockActionPayload;
  const action = payload.actions?.[0];
  if (payload.type !== "block_actions" || !action) return new Response(null, { status: 200 });

  if (action.action_id === "cancel") {
    await postToResponseUrl(payload.response_url, { delete_original: true });
  } else if (action.action_id === "send") {
    const { name } = JSON.parse(action.value) as { name: string };
    const emojiUrl = (await loadCustomEmoji()).get(name);
    if (emojiUrl) {
      await postToResponseUrl(payload.response_url, {
        response_type: "in_channel",
        replace_original: false,
        text: `Sticker :${name}:`,
        blocks: stickerBlocks(name, emojiUrl, payload.user.id),
      });
    }
    await postToResponseUrl(payload.response_url, { delete_original: true });
  } else if (action.action_id === "shuffle") {
    const state = JSON.parse(action.value) as PreviewState;
    const emoji = await loadCustomEmoji();
    const matches = findMatches(state.query, [...emoji.keys()]);
    if (matches.length > 0) {
      const index = state.query
        ? (state.index + 1) % matches.length
        : Math.floor(Math.random() * matches.length);
      const name = matches[index];
      await postToResponseUrl(payload.response_url, {
        replace_original: true,
        text: `Sticker preview: :${name}:`,
        blocks: previewBlocks(name, emoji.get(name)!, { query: state.query, index }, matches.length),
      });
    }
  }

  return new Response(null, { status: 200 });
}
