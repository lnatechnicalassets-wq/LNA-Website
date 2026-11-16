import { describe, expect, it } from "vitest";
import { validMentorWebP } from "./mentor-media";

const raster = Buffer.from(
  "UklGRjQAAABXRUJQVlA4ICgAAACQAQCdASoCAAIAAUAmJZgCdLoAA5gA/vlPP+KAUjgpP+47A3XeIAAA",
  "base64"
);

describe("mentor upload validation", () => {
  it("reads WebP magic bytes and accepts a bounded still image", () => {
    expect(validMentorWebP(raster)).toBe(true);
    expect(validMentorWebP(Buffer.from("<svg onload='alert(1)'/>"))).toBe(false);
  });

  it("rejects truncated and oversized dimensions even with a WebP header", () => {
    expect(validMentorWebP(raster.subarray(0, 27))).toBe(false);
    const oversized = Buffer.from(raster);
    oversized.writeUInt16LE(1601, 26);
    expect(validMentorWebP(oversized)).toBe(false);
  });
});
