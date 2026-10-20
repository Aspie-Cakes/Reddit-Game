export type Pattern =
  "steady" | "faster" | "slower" | "random" | "wave" | "chaos";
export type Mode = "balanced" | "crescendo" | "decrescendo";
export const clamp = (value: number, min = 30, max = 200) =>
  Math.min(max, Math.max(min, value));
export function rhythmBpm(
  base: number,
  pattern: Pattern,
  mode: Mode,
  progress: number,
  beat: number,
  random = Math.random,
): number {
  const ramp =
    mode === "crescendo"
      ? progress * 30
      : mode === "decrescendo"
        ? -progress * 30
        : 0;
  const change =
    pattern === "faster"
      ? progress * 25
      : pattern === "slower"
        ? -progress * 25
        : pattern === "wave"
          ? Math.sin(beat / 8) * 18
          : pattern === "random"
            ? (random() - 0.5) * 24
            : pattern === "chaos"
              ? (random() - 0.5) * 60
              : 0;
  return Math.round(clamp(base + ramp + change));
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
export const difficultyBpm = { gentle: 60, balanced: 80, intense: 110 };
