import { describe, it, expect } from "vitest";
import { rhythmBpm, formatTime } from "./rhythm";
describe("session rhythm", () => {
  it("keeps steady time", () =>
    expect(rhythmBpm(80, "steady", "balanced", 0.5, 10)).toBe(80));
  it("ramps in both directions", () => {
    expect(rhythmBpm(80, "steady", "crescendo", 1, 10)).toBe(110);
    expect(rhythmBpm(80, "steady", "decrescendo", 1, 10)).toBe(50);
  });
  it("bounds even chaotic rhythms", () => {
    expect(rhythmBpm(195, "chaos", "crescendo", 1, 10, () => 1)).toBe(200);
    expect(rhythmBpm(30, "slower", "decrescendo", 1, 10)).toBe(30);
  });
  it("varies wave and random patterns", () => {
    expect(rhythmBpm(80, "wave", "balanced", 0, 12)).toBeGreaterThan(80);
    expect(rhythmBpm(80, "random", "balanced", 0, 1, () => 0)).toBe(68);
  });
  it("formats session time", () => expect(formatTime(125)).toBe("02:05"));
});
