import { previewBlocks, stickerBlocks, type PreviewState } from "../../lib/blocks.js";
import { PICKER_CALLBACK_ID, SEARCH_BLOCK_ID, pickerView, type PickerState } from "../../lib/picker.js";
import { findMatches } from "../../lib/search.js";
import { callSlack, loadCustomEmoji, normalizeQuery, postToResponseUrl, readVerifiedBody } from "../../lib/slack.js";

type Action = { action_id: string; value?: string };

type Payload = {
  type: string;
  user: { id: string };
  trigger_id?: string;
  response_url?: string;
  actions?: Action[];
  view?: { id: string; callback_id: string; private_metadata: string };
};

const ok = () => new Response(null, { status: 200 });

export async function POST(request: Request): Promise<Response> {
  const body = await readVerifiedBody(request);
  if (body === null) return new Response("invalid signature", { status: 401 });

  const payload = JSON.parse(new URLSearchParams(body).get("payload") ?? "{}") as Payload;

  if (payload.type === "view_submission" && payload.view?.callback_id === PICKER_CALLBACK_ID) {
    return submitPicker(payload);
  }

  const action = payload.actions?.[0];
  if (payload.type !== "block_actions" || !action) return ok();

  if (payload.view?.callback_id === PICKER_CALLBACK_ID) {
    await updatePicker(payload, action);
  } else {
    await handleMessageAction(payload, action);
  }
  return ok();
}

async function handleMessageAction(payload: Payload, action: Action): Promise<void> {
  const responseUrl = payload.response_url!;

  if (action.action_id === "cancel") {
    await postToResponseUrl(responseUrl, { delete_original: true });
    return;
  }

  const emoji = await loadCustomEmoji();

  if (action.action_id === "send") {
    const { name } = JSON.parse(action.value!) as { name: string };
    const emojiUrl = emoji.get(name);
    if (emojiUrl) {
      await postToResponseUrl(responseUrl, {
        response_type: "in_channel",
        replace_original: false,
        text: `Sticker :${name}:`,
        blocks: stickerBlocks(name, emojiUrl, payload.user.id),
      });
    }
    await postToResponseUrl(responseUrl, { delete_original: true });
    return;
  }

  const state = JSON.parse(action.value!) as PreviewState;

  if (action.action_id === "browse") {
    await callSlack("views.open", {
      trigger_id: payload.trigger_id,
      view: pickerView({ responseUrl, query: state.query, page: 0, deleteOriginal: true }, emoji),
    });
    return;
  }

  if (action.action_id === "shuffle") {
    const matches = findMatches(state.query, [...emoji.keys()]);
    if (matches.length === 0) return;
    const index = state.query ? (state.index + 1) % matches.length : Math.floor(Math.random() * matches.length);
    const name = matches[index];
    await postToResponseUrl(responseUrl, {
      replace_original: true,
      text: `Sticker preview: :${name}:`,
      blocks: previewBlocks(name, emoji.get(name)!, { query: state.query, index }, matches.length),
    });
  }
}

async function updatePicker(payload: Payload, action: Action): Promise<void> {
  const view = payload.view!;
  const state = JSON.parse(view.private_metadata) as PickerState;

  if (action.action_id === "picker_search") {
    state.query = normalizeQuery(action.value ?? "");
    state.page = 0;
  } else if (action.action_id === "picker_next") {
    state.page += 1;
  } else if (action.action_id === "picker_prev") {
    state.page -= 1;
  } else if (action.action_id === "picker_pick") {
    state.selected = action.value;
  } else {
    return;
  }

  await callSlack("views.update", { view_id: view.id, view: pickerView(state, await loadCustomEmoji()) });
}

async function submitPicker(payload: Payload): Promise<Response> {
  const state = JSON.parse(payload.view!.private_metadata) as PickerState;
  const emojiUrl = state.selected ? (await loadCustomEmoji()).get(state.selected) : undefined;

  if (!state.selected || !emojiUrl) {
    return Response.json({ response_action: "errors", errors: { [SEARCH_BLOCK_ID]: "Press Pick next to a sticker first." } });
  }

  try {
    await postToResponseUrl(state.responseUrl, {
      response_type: "in_channel",
      replace_original: false,
      text: `Sticker :${state.selected}:`,
      blocks: stickerBlocks(state.selected, emojiUrl, payload.user.id),
    });
    if (state.deleteOriginal) await postToResponseUrl(state.responseUrl, { delete_original: true });
  } catch {
    return Response.json({
      response_action: "errors",
      errors: { [SEARCH_BLOCK_ID]: "This picker expired. Close it and run /sticker again." },
    });
  }

  return ok();
}
