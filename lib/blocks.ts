import { stickerImageUrl } from "./slack.js";

export type PreviewState = { query: string; index: number };

export function previewBlocks(name: string, emojiUrl: string, state: PreviewState, total: number) {
  const value = JSON.stringify(state);
  const position = state.query
    ? `Match ${state.index + 1} of ${total} for "${state.query}"`
    : `Random pick from ${total} custom emoji`;
  const nextLabel = state.query && total > 1 ? "Next match" : "Shuffle";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Sticker preview.* Only you can see this. Press *Send* to post it to the channel.",
      },
    },
    { type: "image", title: { type: "plain_text", text: `:${name}:` }, image_url: stickerImageUrl(emojiUrl), alt_text: name },
    { type: "context", elements: [{ type: "mrkdwn", text: position }] },
    {
      type: "actions",
      elements: [
        { type: "button", action_id: "send", text: { type: "plain_text", text: "Send" }, style: "primary", value: JSON.stringify({ name }) },
        { type: "button", action_id: "shuffle", text: { type: "plain_text", text: nextLabel }, value },
        { type: "button", action_id: "cancel", text: { type: "plain_text", text: "Cancel" }, value },
      ],
    },
  ];
}

export function stickerBlocks(name: string, emojiUrl: string, userId: string) {
  return [
    { type: "image", image_url: stickerImageUrl(emojiUrl), alt_text: name },
    { type: "context", elements: [{ type: "mrkdwn", text: `Sent by <@${userId}> with \`/sticker ${name}\`` }] },
  ];
}

export function helpBlocks(total: number) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          "*Stickers* posts your workspace's custom emoji as big images, like GIFs.",
          "",
          "• `/sticker party` finds custom emoji whose name contains _party_",
          "• `/sticker :party-parrot:` works too, colons are optional",
          "• `/sticker` with no name picks a random one",
          "",
          "You always get a private preview first. Use *Next match* or *Shuffle* to browse, then *Send* to post it.",
        ].join("\n"),
      },
    },
    { type: "context", elements: [{ type: "mrkdwn", text: `${total} custom emoji available in this workspace.` }] },
  ];
}
