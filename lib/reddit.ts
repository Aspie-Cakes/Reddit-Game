export interface RedditMedia {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  permalink: string;
  kind: "image" | "video";
  src: string;
  poster?: string;
}
export function subredditName(input: string): string | null {
  const clean = input.trim();
  let name = clean;
  if (/^https?:\/\//i.test(clean)) {
    try {
      const url = new URL(clean);
      if (
        !["reddit.com", "www.reddit.com", "old.reddit.com"].includes(
          url.hostname,
        )
      )
        return null;
      name = url.pathname.match(/^\/r\/([A-Za-z0-9_]+)\/?$/i)?.[1] ?? "";
    } catch {
      return null;
    }
  } else name = clean.replace(/^\/?r\//i, "").replace(/\/$/, "");
  return /^[A-Za-z0-9_]{2,21}$/.test(name) ? name.toLowerCase() : null;
}
export function parseSubreddits(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(subredditName)
        .filter((s): s is string => s !== null),
    ),
  ].slice(0, 12);
}
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
const string = (value: unknown) => (typeof value === "string" ? value : "");
function mediaUrl(value: unknown): string | undefined {
  try {
    const url = new URL(string(value).replaceAll("&amp;", "&"));
    return url.protocol === "https:" &&
      ["i.redd.it", "preview.redd.it", "v.redd.it", "i.imgur.com"].includes(
        url.hostname,
      )
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function extractMedia(
  listing: unknown,
  subreddit: string,
): RedditMedia[] {
  const children = record(record(listing).data).children;
  if (!Array.isArray(children)) return [];
  return children.flatMap((child): RedditMedia[] => {
    const post = record(record(child).data);
    const id = string(post.id);
    const path = string(post.permalink);
    if (
      !id ||
      post.removed_by_category ||
      !path.startsWith("/r/") ||
      path.startsWith("//")
    )
      return [];
    const base = {
      id,
      subreddit,
      title: string(post.title).slice(0, 300),
      author: string(post.author),
      permalink: `https://www.reddit.com${path}`,
    };
    const cross = Array.isArray(post.crosspost_parent_list)
      ? record(post.crosspost_parent_list[0])
      : {};
    const source = Object.keys(cross).length ? cross : post;
    const video = record(
      record(source.secure_media ?? source.media).reddit_video,
    );
    const videoSrc = mediaUrl(video.fallback_url);
    const previews = record(source.preview).images;
    const poster = Array.isArray(previews)
      ? mediaUrl(record(record(previews[0]).source).url)
      : undefined;
    if (videoSrc) return [{ ...base, kind: "video", src: videoSrc, poster }];
    const gallery = record(source.gallery_data).items;
    if (Array.isArray(gallery)) {
      return gallery.flatMap((item, index): RedditMedia[] => {
        const entry = record(
          record(source.media_metadata)[string(record(item).media_id)],
        );
        const asset = record(entry.s);
        const src = mediaUrl(asset.mp4 ?? asset.u ?? asset.gif);
        return src
          ? [
              {
                ...base,
                id: `${id}-${index}`,
                kind: asset.mp4 ? "video" : "image",
                src,
              },
            ]
          : [];
      });
    }
    const url = mediaUrl(source.url_overridden_by_dest ?? source.url);
    if (url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url))
      return [{ ...base, kind: "image", src: url }];
    if (url && /\.mp4(\?|$)/i.test(url))
      return [{ ...base, kind: "video", src: url, poster }];
    return [];
  });
}
/** Choose a community uniformly first, then a post; avoid the current post when possible. */
export function randomMedia(
  items: RedditMedia[],
  currentId?: string,
  random = Math.random,
): RedditMedia | undefined {
  const alternatives = items.filter((item) => item.id !== currentId);
  const pool = alternatives.length ? alternatives : items;
  const communities = [...new Set(pool.map((item) => item.subreddit))];
  if (!communities.length) return undefined;
  const community =
    communities[
      Math.min(
        communities.length - 1,
        Math.floor(random() * communities.length),
      )
    ];
  const candidates = pool.filter((item) => item.subreddit === community);
  return candidates[
    Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  ];
}
