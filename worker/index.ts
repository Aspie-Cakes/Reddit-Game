import { extractMedia, subredditName } from "../lib/reddit";
interface Env {
  REDDIT_CLIENT_ID?: string;
  REDDIT_CLIENT_SECRET?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}
const userAgent =
  "AriaHouse/1.0 (public media viewer; github.com/Aspie-Cakes/Reddit-Game)";
let token: { value: string; expires: number; clientId: string } | undefined;
let pendingToken: Promise<string> | undefined;
async function authorization(env: Env): Promise<string | undefined> {
  if (!env.REDDIT_CLIENT_ID && !env.REDDIT_CLIENT_SECRET) return undefined;
  if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET)
    throw new Error("Both Reddit credentials are required.");
  if (
    token &&
    token.clientId === env.REDDIT_CLIENT_ID &&
    token.expires > Date.now()
  )
    return token.value;
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error("Reddit authentication failed.");
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) throw new Error("Reddit did not grant API access.");
    token = {
      value: data.access_token,
      expires: Date.now() + Math.max(0, (data.expires_in ?? 3600) - 60) * 1000,
      clientId: env.REDDIT_CLIENT_ID!,
    };
    return token.value;
  })();
  try {
    return await pendingToken;
  } finally {
    pendingToken = undefined;
  }
}
const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": status === 200 ? "public, max-age=120" : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname !== "/api/reddit")
      return response({ error: "API route not found." }, 404);
    if (request.method !== "GET")
      return response({ error: "Use GET for Reddit media." }, 405);
    const name = subredditName(url.searchParams.get("subreddit") ?? "");
    if (!name)
      return response(
        { error: "Enter a valid subreddit name or Reddit community link." },
        400,
      );
    try {
      const accessToken = await authorization(env);
      const upstream = await fetch(
        `https://${accessToken ? "oauth.reddit.com" : "www.reddit.com"}/r/${name}/hot${accessToken ? "" : ".json"}?limit=100&raw_json=1`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": userAgent,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!upstream.ok) {
        const status = upstream.status;
        return response(
          {
            error:
              status === 429
                ? "Reddit is rate limiting requests. Please try again later."
                : status === 403
                  ? "Reddit denied public API access. This community may be restricted or Reddit may require approved API access."
                  : status === 404
                    ? "This community was not found or is unavailable."
                    : `Reddit could not load this community (HTTP ${status}).`,
          },
          status === 429 ? 429 : 502,
        );
      }
      const items = extractMedia(await upstream.json(), name);
      return response({ items, subreddit: name });
    } catch {
      return response(
        {
          error:
            "Reddit could not be reached or API authentication failed. Check Reddit access and try again shortly.",
        },
        502,
      );
    }
  },
};
