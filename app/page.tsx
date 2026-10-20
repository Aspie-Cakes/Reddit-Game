"use client";
import { useEffect, useRef, useState } from "react";
import {
  difficultyBpm,
  formatTime,
  rhythmBpm,
  type Mode,
  type Pattern,
} from "@/lib/rhythm";
const patterns: Pattern[] = [
  "steady",
  "faster",
  "slower",
  "random",
  "wave",
  "chaos",
];
type Status = "idle" | "running" | "paused" | "finished";
export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [bpm, setBpm] = useState(80),
    [liveBpm, setLiveBpm] = useState(80),
    [duration, setDuration] = useState(10),
    [elapsed, setElapsed] = useState(0);
  const [pattern, setPattern] = useState<Pattern>("steady"),
    [mode, setMode] = useState<Mode>("balanced");
  const [difficulty, setDifficulty] =
    useState<keyof typeof difficultyBpm>("balanced");
  const [automatic, setAutomatic] = useState(true),
    [voice, setVoice] = useState(true),
    [sound, setSound] = useState(true),
    [volume, setVolume] = useState(0.35);
  const [beat, setBeat] = useState(0),
    [dialogue, setDialogue] = useState(
      "Come on in. Leave the noise outside. Let’s find a rhythm that feels like you.",
    );
  const [speechAvailable, setSpeechAvailable] = useState(false),
    [audioError, setAudioError] = useState("");
  const audio = useRef<AudioContext | null>(null),
    beats = useRef(0),
    elapsedRef = useRef(0),
    deadline = useRef(0),
    lastCue = useRef(0);
  const settings = useRef({ bpm, pattern, mode, duration, sound, volume });
  settings.current = { bpm, pattern, mode, duration, sound, volume };
  const say = (message: string) => {
    setDialogue(message);
    if (voice && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(message);
      speech.rate = 0.88;
      speech.pitch = 1.05;
      window.speechSynthesis.speak(speech);
    }
  };
  useEffect(() => {
    setSpeechAvailable("speechSynthesis" in window);
    return () => {
      audio.current?.close();
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    if (!voice) window.speechSynthesis?.cancel();
  }, [voice]);
  useEffect(() => {
    if (status !== "running") return;
    deadline.current =
      performance.now() + (duration * 60 - elapsedRef.current) * 1000;
    const timer = setInterval(() => {
      const next = Math.min(
        duration * 60,
        Math.floor(
          duration * 60 - (deadline.current - performance.now()) / 1000,
        ),
      );
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= duration * 60) {
        setStatus("finished");
        say("Beautifully done. Take a breath. This moment is yours.");
        return;
      }
      const cue = Math.floor(next / 120);
      if (cue > lastCue.current) {
        lastCue.current = cue;
        if (automatic) {
          const p = patterns[cue % patterns.length];
          setPattern(p);
          say(
            `Let’s shift into a ${p} rhythm. Relax your shoulders and follow the pulse.`,
          );
        } else
          say(
            "Take a gentle breath. Stay comfortable, and follow your own rhythm.",
          );
      }
    }, 200);
    return () => clearInterval(timer);
    // Settings changes must not reset the active clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, duration, automatic, voice]);
  useEffect(() => {
    if (status !== "running") return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const s = settings.current;
      const value = rhythmBpm(
        s.bpm,
        s.pattern,
        s.mode,
        elapsedRef.current / (s.duration * 60),
        beats.current,
      );
      setLiveBpm(value);
      setBeat(++beats.current);
      const ctx = audio.current;
      if (s.sound && ctx && ctx.state === "running") {
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = beats.current % 4 === 1 ? 880 : 580;
        gain.gain.setValueAtTime(s.volume * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.07);
      }
      timer = setTimeout(tick, 60000 / value);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status]);
  const begin = async () => {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setAudioError("");
    } catch {
      setAudioError(
        "Audio is unavailable. Visual rhythm and session controls still work.",
      );
    }
    if (status !== "paused") {
      elapsedRef.current = 0;
      setElapsed(0);
      beats.current = 0;
      lastCue.current = 0;
    }
    setStatus("running");
    say(
      status === "paused"
        ? "Welcome back. Let’s ease into the rhythm."
        : "Welcome to my house. Take a breath, settle in, and follow the pulse.",
    );
  };
  const pause = () => {
    setStatus("paused");
    window.speechSynthesis?.cancel();
    setDialogue("Take your time. Your rhythm will be here when you’re ready.");
  };
  const stop = () => {
    setStatus("idle");
    setElapsed(0);
    elapsedRef.current = 0;
    setBeat(0);
    window.speechSynthesis?.cancel();
    setDialogue("A little stillness. Start again whenever you feel ready.");
  };
  const active = status === "running" || status === "paused";
  return (
    <main className="shell">
      <header>
        <a href="#" className="brand">
          <span className="brand-mark">✳︎</span> aria’s house
          <span className="brand-dot">.</span>
        </a>
        <span className="header-note">A SPACE TO FIND YOUR FLOW</span>
        <span className="live-tag">
          <i /> YOUR PRIVATE ESCAPE
        </span>
      </header>
      <section className="intro">
        <span className="eyebrow">STEP INSIDE. TUNE IN.</span>
        <h1>
          Your rhythm.
          <br />
          <em>Her guidance.</em>
        </h1>
        <p>Let the world fade. Aria will take it from here.</p>
      </section>
      <div className="studio">
        <section
          className="character-card"
          aria-label="Aria, your adult AI rhythm companion"
        >
          <div className="character-top">
            <span className="pill">
              <i /> ARIA IS HERE
            </span>
            <span className="tiny">YOUR AI COMPANION · 25+</span>
          </div>
          <div className={`portrait ${status === "running" ? "awake" : ""}`}>
            <div className="halo halo-one" />
            <div className="halo halo-two" />
            <div className="spark s1">✧</div>
            <div className="spark s2">✦</div>
            <div className="spark s3">✧</div>
            <svg
              viewBox="0 0 400 450"
              role="img"
              aria-label="Aria, an original illustrated adult woman with violet hair and a warm smile"
            >
              <defs>
                <linearGradient id="hair" x2="1" y2="1">
                  <stop stopColor="#25163d" />
                  <stop offset=".5" stopColor="#745289" />
                  <stop offset="1" stopColor="#281631" />
                </linearGradient>
                <linearGradient id="skin" x2="1" y2="1">
                  <stop stopColor="#f2c0bd" />
                  <stop offset="1" stopColor="#ba7e94" />
                </linearGradient>
                <linearGradient id="shirt" x2="0" y2="1">
                  <stop stopColor="#32223f" />
                  <stop offset="1" stopColor="#130f20" />
                </linearGradient>
              </defs>
              <path
                d="M85 353Q51 162 109 85Q200-4 288 88Q346 166 312 365Z"
                fill="url(#hair)"
              />
              <path
                d="M57 450Q51 349 137 327L167 310H235L264 328Q350 346 349 450"
                fill="url(#shirt)"
              />
              <path
                d="M170 267L166 319Q201 353 236 317L230 267"
                fill="url(#skin)"
              />
              <ellipse cx="201" cy="198" rx="82" ry="108" fill="url(#skin)" />
              <path
                d="M116 206Q83 103 151 69Q241 19 290 125L287 242Q270 151 226 103Q177 158 116 162Z"
                fill="url(#hair)"
              />
              <path
                d="M138 191Q155 181 173 189M225 189Q243 180 259 191"
                fill="none"
                stroke="#59334f"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M139 208Q157 219 175 207M225 207Q242 219 260 207"
                fill="none"
                stroke="#38213e"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M199 215L193 238L204 240"
                fill="none"
                stroke="#af728a"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M176 260Q200 274 225 258Q203 291 176 260"
                fill="#8e425f"
              />
              <path
                d="M183 262Q200 267 218 261"
                stroke="#f7d6d7"
                strokeWidth="3"
              />
              <ellipse
                cx="150"
                cy="238"
                rx="17"
                ry="7"
                fill="#dc89a5"
                opacity=".35"
              />
              <ellipse
                cx="249"
                cy="238"
                rx="17"
                ry="7"
                fill="#dc89a5"
                opacity=".35"
              />
              <path
                d="M132 134Q102 244 139 364M272 134Q309 268 267 375"
                fill="none"
                stroke="#94709f"
                strokeWidth="12"
                opacity=".4"
              />
              <circle cx="122" cy="239" r="5" fill="#f4d497" />
              <circle cx="280" cy="239" r="5" fill="#f4d497" />
              <path
                d="M163 331Q201 385 240 331"
                stroke="#c89cba"
                strokeWidth="2"
                fill="none"
              />
              <path d="M196 360L201 370L206 360L201 353Z" fill="#ebbad7" />
            </svg>
            <div className="portrait-label">
              <span>Meet Aria</span>
              <small>A little guidance. A little magic.</small>
            </div>
          </div>
          <div className="dialogue">
            <span className="quote">“</span>
            <p aria-live="polite">{dialogue}</p>
            <button
              className={`voice-button ${voice ? "selected" : ""}`}
              aria-label={voice ? "Mute Aria voice" : "Enable Aria voice"}
              aria-pressed={voice}
              onClick={() => setVoice(!voice)}
            >
              ◖))
            </button>
          </div>
          <div className="character-footer">
            <span>
              <i />{" "}
              {status === "running"
                ? "Guiding your session"
                : "Here when you’re ready"}
            </span>
            <span>✧ ALWAYS YOUR PACE</span>
          </div>
        </section>
        <section className="control-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MAKE IT YOURS</span>
              <h2>The rhythm room</h2>
            </div>
            <span className="room-icon">⌁</span>
          </div>
          <div className="tempo">
            <div className="tempo-label">
              <label htmlFor="tempo">TEMPO</label>
              <span>
                {status === "running" ? "LIVE RHYTHM" : "FIND YOUR SWEET SPOT"}
              </span>
            </div>
            <div className="bpm-row">
              <button
                aria-label="Decrease BPM"
                onClick={() => setBpm(Math.max(30, bpm - 5))}
              >
                −
              </button>
              <div>
                <strong>{status === "running" ? liveBpm : bpm}</strong>
                <span>BPM</span>
              </div>
              <button
                aria-label="Increase BPM"
                onClick={() => setBpm(Math.min(200, bpm + 5))}
              >
                +
              </button>
            </div>
            <input
              id="tempo"
              aria-label="Base tempo"
              type="range"
              min="30"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(+e.target.value)}
            />
            <div className="range-labels">
              <span>30 · SLOW & EASY</span>
              <span>200 · FEEL THE ENERGY</span>
            </div>
            <div
              className="beat-dots"
              aria-label={`Beat ${(beat % 4) + 1} of 4`}
            >
              {[0, 1, 2, 3].map((n) => (
                <i
                  key={n}
                  className={
                    status === "running" && (beat - 1) % 4 === n ? "lit" : ""
                  }
                />
              ))}
            </div>
          </div>
          <fieldset>
            <legend>RHYTHM PATTERN</legend>
            <div className="patterns">
              {patterns.map((p, i) => (
                <button
                  key={p}
                  className={pattern === p ? "selected" : ""}
                  aria-pressed={pattern === p}
                  onClick={() => setPattern(p)}
                >
                  <span>{["≋", "↑", "↓", "⤨", "∿", "ϟ"][i]}</span>
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>ENERGY FLOW</legend>
            <div className="segments">
              {(["balanced", "crescendo", "decrescendo"] as Mode[]).map((m) => (
                <button
                  key={m}
                  className={mode === m ? "selected" : ""}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  {m === "balanced"
                    ? "↔ Balanced"
                    : m === "crescendo"
                      ? "↑ Crescendo"
                      : "↓ Decrescendo"}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="auto-row">
            <div>
              <strong>
                Let Aria lead <span>✧</span>
              </strong>
              <p>Fresh guidance & rhythm shifts every 2 minutes</p>
            </div>
            <button
              className={`toggle ${automatic ? "on" : ""}`}
              role="switch"
              aria-checked={automatic}
              aria-label="Automatic rhythm changes"
              onClick={() => setAutomatic(!automatic)}
            >
              <i />
            </button>
          </div>
          <div className="session-options">
            <label>
              SESSION LENGTH
              <select
                disabled={active}
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              >
                {[5, 10, 15, 20, 30, 60].map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </label>
            <label>
              DIFFICULTY
              <select
                value={difficulty}
                onChange={(e) => {
                  const d = e.target.value as keyof typeof difficultyBpm;
                  setDifficulty(d);
                  setBpm(difficultyBpm[d]);
                }}
              >
                {Object.keys(difficultyBpm).map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="session-progress">
            <div>
              <span>
                {status === "finished"
                  ? "SESSION COMPLETE"
                  : status === "paused"
                    ? "TAKE A BREATHER"
                    : status === "running"
                      ? "IN YOUR FLOW"
                      : "YOUR MOMENT STARTS HERE"}
              </span>
              <span>
                {formatTime(elapsed)} <b>/ {formatTime(duration * 60)}</b>
              </span>
            </div>
            <progress
              aria-label="Session progress"
              value={elapsed}
              max={duration * 60}
            />
          </div>
          <div className="transport">
            <button
              className="start"
              onClick={status === "running" ? pause : begin}
            >
              {status === "running"
                ? "Ⅱ Pause session"
                : status === "paused"
                  ? "▶︎ Resume session"
                  : status === "finished"
                    ? "↻ Start again"
                    : "▶︎ Begin your session"}
              <span>✧</span>
            </button>
            {active && (
              <button className="stop" onClick={stop} aria-label="Stop session">
                ■
              </button>
            )}
          </div>
          <div className="sound-controls">
            <label>
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => setSound(e.target.checked)}
              />{" "}
              Metronome sound
            </label>
            <input
              type="range"
              aria-label="Metronome volume"
              min="0"
              max="1"
              step=".05"
              value={volume}
              onChange={(e) => setVolume(+e.target.value)}
            />
          </div>
          {audioError && (
            <p role="alert" className="notice">
              {audioError}
            </p>
          )}
          {!speechAvailable && (
            <p className="notice">
              Spoken guidance needs a browser with text-to-speech. Dialogue is
              always shown.
            </p>
          )}
        </section>
      </div>
      <section className="bottom-notes">
        <div>
          <span>◈</span>
          <p>
            <strong>Just you. Just now.</strong>
            <small>
              No accounts. No distractions. Your session stays here.
            </small>
          </p>
        </div>
        <div>
          <span>♫</span>
          <p>
            <strong>A soundtrack is on its way</strong>
            <small>
              Music is coming to the house. For now, enjoy the pulse.
            </small>
          </p>
          <span className="soon">COMING LATER</span>
        </div>
      </section>
      <footer>
        <span>✳︎ aria’s house.</span>
        <p>Find your rhythm. Make yourself at home.</p>
        <small>
          Aria is an original adult AI character. Take breaks and stay
          comfortable.
        </small>
      </footer>
    </main>
  );
}
