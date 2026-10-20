"use client";
import { useEffect, useRef, useState } from "react";
import { parseSubreddits, randomMedia, type RedditMedia } from "@/lib/reddit";
import { defaultSubreddits } from "@/lib/reddit-defaults";
const STORAGE = "arias-house-subreddits-v1";
export default function RedditViewer() {
  const [input, setInput] = useState(""),
    [communities, setCommunities] = useState<string[]>([]),
    [items, setItems] = useState<RedditMedia[]>([]);
  const [current, setCurrent] = useState<RedditMedia>(),
    [running, setRunning] = useState(false),
    [loading, setLoading] = useState(false),
    [errors, setErrors] = useState<string[]>([]),
    [remaining, setRemaining] = useState(15);
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [storageError, setStorageError] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    deadline = useRef(0);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      const names = saved ? parseSubreddits(saved) : defaultSubreddits;
      setInput(names.map((s) => `r/${s}`).join(", "));
      setCommunities(names);
    } catch {
      setInput(defaultSubreddits.map((s) => `r/${s}`).join(", "));
      setCommunities(defaultSubreddits);
      setStorageError(
        "Your browser cannot save this community list. It will work for this visit.",
      );
    }
  }, []);
  useEffect(() => {
    setItems([]);
    setCurrent(undefined);
    setRunning(false);
    setErrors([]);
    if (!communities.length) return;
    const controller = new AbortController();
    setLoading(true);
    Promise.all(
      communities.map(async (name) => {
        try {
          const res = await fetch(
            `/api/reddit?subreddit=${encodeURIComponent(name)}`,
            { signal: controller.signal },
          );
          if (!res.headers.get("content-type")?.includes("application/json"))
            throw new Error(
              "The Reddit service is unavailable on this host. Use the Cloudflare Worker deployment.",
            );
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Reddit request failed.");
          const media = body.items as RedditMedia[];
          if (!Array.isArray(media))
            throw new Error("Reddit returned an unexpected response.");
          return {
            media,
            error: media.length
              ? ""
              : `r/${name}: No supported photos or videos in the latest posts.`,
          };
        } catch (error) {
          return {
            media: [] as RedditMedia[],
            error: `r/${name}: ${error instanceof Error ? error.message : "Could not load media."}`,
          };
        }
      }),
    ).then((results) => {
      if (controller.signal.aborted) return;
      const media = results.flatMap((r) => r.media);
      setItems(media);
      setCurrent(randomMedia(media));
      setErrors(results.map((r) => r.error).filter(Boolean));
      setRunning(media.length > 0);
      setLoading(false);
      setRemaining(15);
    });
    return () => controller.abort();
  }, [communities, retry]);
  useEffect(() => {
    if (!running || !current) return;
    deadline.current = Date.now() + 15000;
    setRemaining(15);
    const timer = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) {
        setCurrent((item) => randomMedia(items, item?.id));
        deadline.current = Date.now() + 15000;
        setRemaining(15);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [running, current, items]);
  useEffect(() => {
    setFailed(false);
  }, [current?.id]);
  useEffect(() => {
    if (video.current) {
      if (running) video.current.play().catch(() => {});
      else video.current.pause();
    }
  }, [running, current]);
  const next = () => {
    setCurrent((item) => randomMedia(items, item?.id));
    setFailed(false);
    deadline.current = Date.now() + 15000;
    setRemaining(15);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const names = parseSubreddits(input);
    if (!names.length) {
      setErrors(["Add at least one valid subreddit name or community link."]);
      return;
    }
    const tokens = input.split(/[\s,]+/).filter(Boolean);
    if (tokens.some((t) => !parseSubreddits(t).length)) {
      setErrors([
        "One or more links are invalid. Use community links such as https://www.reddit.com/r/EarthPorn/ or r/EarthPorn.",
      ]);
      return;
    }
    if (tokens.length > 12) {
      setErrors(["Use up to 12 communities at a time."]);
      return;
    }
    try {
      localStorage.setItem(STORAGE, names.join(","));
    } catch {
      setStorageError("This list could not be saved in your browser.");
    }
    setCommunities(names);
  };
  return (
    <section className="reddit-room" aria-labelledby="reddit-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">A NEW VIEW EVERY 15 SECONDS</span>
          <h2 id="reddit-heading">Your Reddit room</h2>
        </div>
        <span className="reddit-status">
          {loading ? "LOADING" : running ? "SHUFFLE ON" : "SHUFFLE PAUSED"}
        </span>
      </div>
      <p className="reddit-description">
        Add your communities. Aria’s House will pick a random community and a
        random photo or video every 15 seconds.
      </p>
      <form onSubmit={save} className="reddit-form">
        <label htmlFor="communities">
          SUBREDDITS <small>Up to 12 · separated by commas or new lines</small>
        </label>
        <textarea
          id="communities"
          placeholder="r/EarthPorn, r/aww, or paste your subreddit links"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading media…" : "Load communities"}
        </button>
      </form>
      {storageError && <p className="notice">{storageError}</p>}
      {errors.length > 0 && (
        <div className="reddit-errors" role="status">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
          {communities.length > 0 && (
            <button onClick={() => setRetry((n) => n + 1)} disabled={loading}>
              Retry Reddit
            </button>
          )}
        </div>
      )}
      <div className="media-stage" aria-busy={loading}>
        {current ? (
          <>
            {!failed &&
              (current.kind === "image" ? (
                <img
                  key={current.id}
                  src={current.src}
                  alt={current.title}
                  referrerPolicy="no-referrer"
                  onError={() => setFailed(true)}
                />
              ) : (
                <video
                  key={current.id}
                  ref={video}
                  src={current.src}
                  poster={current.poster}
                  controls
                  muted
                  autoPlay={running}
                  playsInline
                  loop
                  preload="metadata"
                  onError={() => setFailed(true)}
                  aria-label={current.title}
                />
              ))}
            {failed && (
              <div className="media-empty">
                <p>This media could not be played or loaded.</p>
                <button onClick={next}>Skip to another post</button>
              </div>
            )}
          </>
        ) : (
          <div className="media-empty">
            <span>▧</span>
            <p>
              {loading
                ? "Finding photos and videos…"
                : communities.length
                  ? "No media loaded. Check the messages above or try another community."
                  : "Your communities, on shuffle."}
            </p>
            <small>Paste your subreddit links above to get started.</small>
          </div>
        )}
      </div>
      {current && (
        <div className="media-caption">
          <div>
            <a
              href={`https://www.reddit.com/r/${current.subreddit}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              r/{current.subreddit}
            </a>
            <h3>{current.title}</h3>
            <small>
              u/{current.author} ·{" "}
              {current.kind === "video" ? "Video" : "Photo"} ·{" "}
              <a
                href={current.permalink}
                target="_blank"
                rel="noopener noreferrer"
              >
                View original on Reddit ↗
              </a>
            </small>
          </div>
          <span>{remaining}s</span>
        </div>
      )}
      <div className="media-transport">
        <button
          disabled={!current || loading}
          onClick={() => setRunning(!running)}
        >
          {running ? "Pause slideshow" : "Resume slideshow"}
        </button>
        <button disabled={!current || loading} onClick={next}>
          Next random post →
        </button>
        <span>
          {items.length} media items ·{" "}
          {new Set(items.map((i) => i.subreddit)).size} communities loaded
        </span>
      </div>
      <p className="reddit-footnote">
        Videos start muted; use the player controls for sound. Reddit-hosted
        videos, galleries, GIFs, and direct images are supported. Some Reddit
        video files have no audio track. Private, restricted, deleted, or
        externally embedded media may be unavailable. Community names are saved
        only in this browser; loading media contacts Reddit and its media hosts.
      </p>
    </section>
  );
}
