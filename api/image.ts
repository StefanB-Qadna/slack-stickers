import sharp from "sharp";

const ALLOWED_HOST = "emoji.slack-edge.com";
const STICKER_SIZE = 320;

export async function GET(request: Request): Promise<Response> {
  const src = new URL(request.url).searchParams.get("src");
  let source: URL;
  try {
    source = new URL(src ?? "");
  } catch {
    return new Response("invalid src", { status: 400 });
  }
  if (source.protocol !== "https:" || source.hostname !== ALLOWED_HOST) {
    return new Response("src not allowed", { status: 400 });
  }

  const upstream = await fetch(source);
  if (!upstream.ok) return new Response("emoji not found", { status: 502 });

  const image = sharp(Buffer.from(await upstream.arrayBuffer()), { animated: true });
  const { format } = await image.metadata();
  const resized = image.resize({
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const isGif = format === "gif";
  const output = isGif ? await resized.gif().toBuffer() : await resized.png().toBuffer();

  return new Response(new Uint8Array(output), {
    headers: {
      "content-type": isGif ? "image/gif" : "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
