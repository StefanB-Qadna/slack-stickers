# slack-stickers

A `/sticker` command for Slack that posts your workspace's custom emoji as big images, the way Giphy posts GIFs.

Custom emoji are tiny in a conversation, even when you send one on its own. This app takes the emoji you pick, scales it up to 320x320 and posts it as an image block. Animated emoji stay animated.

## Usage

```
/sticker party
```

You get a preview that only you can see. From there you can:

- **Send** to post the sticker to the channel
- **Next match** to see the next emoji whose name contains your search
- **Cancel** to throw the preview away

Other forms:

| Command | What it does |
| --- | --- |
| `/sticker party` | Emoji whose name contains `party`, exact match first |
| `/sticker :party-parrot:` | Same thing, the colons are optional |
| `/sticker` | A random emoji, with a **Shuffle** button |
| `/sticker help` | Usage and the number of custom emoji in the workspace |

The posted sticker shows who sent it and the command they used, so people pick it up quickly.

## How it works

There are three Vercel functions and no database.

- `api/slack/command.ts` handles `/sticker`. It loads the custom emoji with `emoji.list`, keeps the list in memory for 5 minutes and replies with the preview.
- `api/slack/interactions.ts` handles the buttons. Sending goes through the command's `response_url`, so the app does not need to be a member of the channel. It works in private channels and DMs too.
- `api/image.ts` downloads the emoji from `emoji.slack-edge.com` and resizes it with [sharp](https://sharp.pixelplumbing.com). It only accepts URLs from that host. Responses are cached as immutable, so each emoji is resized once and then served from the CDN.

The app asks for two scopes: `commands` and `emoji:read`. It cannot read messages.

## Setup

You need a Vercel account and permission to install apps in your Slack workspace. If you are not an admin, Slack sends your admins an approval request when you install.

**1. Deploy to Vercel**

```sh
git clone https://github.com/StefanB-Qadna/slack-stickers.git
cd slack-stickers
npm install
vercel deploy --prod
```

Note the production domain, for example `slack-stickers-yourteam.vercel.app`.

**2. Create the Slack app**

1. In `slack-manifest.yml`, replace `your-app.vercel.app` with your domain. It appears twice.
2. Go to [api.slack.com/apps](https://api.slack.com/apps) and choose **Create New App**, then **From a manifest**.
3. Pick your workspace and paste the manifest.
4. Click **Install to Workspace**.

**3. Add the credentials to Vercel**

| Variable | Where to find it |
| --- | --- |
| `SLACK_SIGNING_SECRET` | **Basic Information**, under **App Credentials** |
| `SLACK_BOT_TOKEN` | **OAuth & Permissions**, the token starting with `xoxb-` |

```sh
vercel env add SLACK_SIGNING_SECRET production
vercel env add SLACK_BOT_TOKEN production
vercel deploy --prod
```

The redeploy matters. Vercel only picks up new environment variables on the next deployment.

Run `/sticker help` in any channel to check that it works.

## Limitations

- Only custom emoji. Standard emoji like `:thumbsup:` are not included, and neither are custom aliases that point to them.
- Small emoji get soft when scaled up. Pixel art emoji look blurry.
- Stickers are posted by the app, with the sender's name underneath, not as the sender.
- A custom emoji named `help` cannot be sent by name, because `/sticker help` shows the help text.

## Development

```sh
npm install
npm run typecheck
```

The functions use the standard `Request` and `Response` objects, so you can import a handler and call it directly in a test. Requests must carry a valid Slack signature, which you can generate with the signing secret.

## License

[MIT](LICENSE)
