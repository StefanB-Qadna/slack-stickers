import { findMatches } from "./search.js";
import { stickerImageUrl } from "./slack.js";

export const PICKER_CALLBACK_ID = "sticker_picker";
export const SEARCH_BLOCK_ID = "search";
const PAGE_SIZE = 20;

export type PickerState = {
  responseUrl: string;
  query: string;
  page: number;
  selected?: string;
  deleteOriginal?: boolean;
};

export function pickerView(state: PickerState, emoji: Map<string, string>) {
  const matches = findMatches(state.query, [...emoji.keys()]);
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(Math.max(state.page, 0), pageCount - 1);
  const visible = matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedUrl = state.selected ? emoji.get(state.selected) : undefined;

  const blocks: object[] = [];

  if (state.selected && selectedUrl) {
    blocks.push(
      { type: "image", title: { type: "plain_text", text: state.selected }, image_url: stickerImageUrl(selectedUrl), alt_text: state.selected },
      { type: "context", elements: [{ type: "mrkdwn", text: "Press *Send* to post this sticker, or pick a different one below." }] },
    );
  } else {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: "Search by name or scroll through the list. Press *Pick* to see a sticker full size." }],
    });
  }

  blocks.push({
    type: "input",
    block_id: SEARCH_BLOCK_ID,
    optional: true,
    dispatch_action: true,
    label: { type: "plain_text", text: "Search" },
    element: {
      type: "plain_text_input",
      action_id: "picker_search",
      placeholder: { type: "plain_text", text: "Part of a name, like party" },
      dispatch_action_config: { trigger_actions_on: ["on_character_entered"] },
      ...(state.query ? { initial_value: state.query } : {}),
    },
  });

  if (visible.length === 0) {
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `No sticker names match "${state.query}".` }] });
  }

  for (const name of visible) {
    const picked = name === state.selected;
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `:${name}:  \`${name}\`` },
      accessory: {
        type: "button",
        action_id: "picker_pick",
        value: name,
        text: { type: "plain_text", text: picked ? "Picked" : "Pick" },
        ...(picked ? { style: "primary" } : {}),
      },
    });
  }

  if (pageCount > 1) {
    const navigation = [];
    if (page > 0) navigation.push({ type: "button", action_id: "picker_prev", text: { type: "plain_text", text: "Previous" } });
    if (page < pageCount - 1) navigation.push({ type: "button", action_id: "picker_next", text: { type: "plain_text", text: "Next" } });
    blocks.push(
      { type: "context", elements: [{ type: "mrkdwn", text: `Page ${page + 1} of ${pageCount}, ${matches.length} stickers` }] },
      { type: "actions", elements: navigation },
    );
  }

  return {
    type: "modal",
    callback_id: PICKER_CALLBACK_ID,
    private_metadata: JSON.stringify({ ...state, page }),
    title: { type: "plain_text", text: "Stickers" },
    submit: { type: "plain_text", text: "Send" },
    close: { type: "plain_text", text: "Cancel" },
    blocks,
  };
}
