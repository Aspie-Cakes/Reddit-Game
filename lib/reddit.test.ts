import { describe, it, expect, afterEach, vi } from "vitest";
import {
  parseSubreddits,
  extractMedia,
  randomMedia,
  subredditName,
} from "./reddit";
import worker from "../worker/index";
const listing = {
  data: {
    children: [
      {
        data: {
          id: "photo",
          title: "A photo",
          author: "example",
          permalink: "/r/test/comments/photo/title/",
          url: "https://i.redd.it/image.jpg",
        },
      },
      {
        data: {
          id: "video",
          title: "A video",
          author: "example",
          permalink: "/r/test/comments/video/title/",
          secure_media: {
            reddit_video: {
              fallback_url: "https://v.redd.it/clip/DASH_720.mp4",
            },
          },
        },
      },
    ],
  },
};
afterEach(() => vi.unstubAllGlobals());
describe("Reddit media", () => {
  it("normalizes and deduplicates community links", () =>
    expect(
      parseSubreddits(
        "https://www.reddit.com/r/RubyJay/, r/RubyJay r/MiyaCech",
      ),
    ).toEqual(["rubyjay", "miyacech"]));
  it("rejects non-Reddit hosts and invalid names", () => {
    expect(subredditName("https://evil.com/r/test/")).toBeNull();
    expect(subredditName("../test")).toBeNull();
    expect(subredditName("https://reddit.com/r/test/comments/id")).toBeNull();
  });
  it("extracts direct photos and Reddit videos", () =>
    expect(extractMedia(listing, "test").map((i) => i.kind)).toEqual([
      "image",
      "video",
    ]));
  it("extracts galleries, skips removed posts and unsafe URLs", () => {
    const data = {
      data: {
        children: [
          {
            data: {
              id: "g",
              permalink: "/r/test/comments/g/",
              gallery_data: { items: [{ media_id: "one" }] },
              media_metadata: {
                one: {
                  s: { u: "https://preview.redd.it/image.png?x=1&amp;y=2" },
                },
              },
            },
          },
          {
            data: {
              id: "bad",
              permalink: "/r/test/comments/bad/",
              url: "https://evil.com/image.jpg",
            },
          },
          {
            data: {
              id: "gone",
              removed_by_category: "deleted",
              permalink: "/r/test/comments/gone/",
              url: "https://i.redd.it/a.jpg",
            },
          },
        ],
      },
    };
    expect(extractMedia(data, "test")).toMatchObject([
      { id: "g-0", src: "https://preview.redd.it/image.png?x=1&y=2" },
    ]);
  });
  it("avoids immediate repeats and selects a community first", () => {
    const items = extractMedia(listing, "test");
    expect(randomMedia(items, "photo", () => 0)?.id).toBe("video");
    expect(randomMedia([])).toBeUndefined();
  });
  it("serves normalized media through the Worker API", async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json(listing));
    vi.stubGlobal("fetch", upstream);
    const res = await worker.fetch(
      new Request("https://house.test/api/reddit?subreddit=test"),
      { ASSETS: { fetch: vi.fn() } },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(2);
    expect(upstream.mock.calls[0][0]).toBe(
      "https://www.reddit.com/r/test/hot.json?limit=100&raw_json=1",
    );
  });
  it("reports upstream access denial without inventing media", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("blocked", { status: 403 })),
    );
    const res = await worker.fetch(
      new Request("https://house.test/api/reddit?subreddit=test"),
      { ASSETS: { fetch: vi.fn() } },
    );
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("denied");
  });
  it("rejects invalid communities without fetching and passes through assets", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const assets = { fetch: vi.fn().mockResolvedValue(new Response("site")) };
    expect(
      (
        await worker.fetch(
          new Request("https://house.test/api/reddit?subreddit=.."),
          { ASSETS: assets },
        )
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      await (
        await worker.fetch(new Request("https://house.test/"), {
          ASSETS: assets,
        })
      ).text(),
    ).toBe("site");
  });
  it("uses server-only OAuth credentials when configured", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ access_token: "test-access", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(Response.json(listing));
    vi.stubGlobal("fetch", fetcher);
    const res = await worker.fetch(
      new Request("https://house.test/api/reddit?subreddit=test"),
      {
        ASSETS: { fetch: vi.fn() },
        REDDIT_CLIENT_ID: "test-client",
        REDDIT_CLIENT_SECRET: "test-secret",
      },
    );
    expect(res.status).toBe(200);
    expect(fetcher.mock.calls[1][0]).toContain("https://oauth.reddit.com/");
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer test-access",
    );
    expect(await res.text()).not.toContain("test-secret");
  });
});
