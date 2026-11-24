import { describe, expect, it } from "vitest";

import { cropForRow, cropStyle } from "./imageCrop";

const box = (y: number, height: number) => ({
  text: "t",
  x: 0.1,
  y,
  width: 0.8,
  height,
});

describe("cropForRow", () => {
  it("covers the lines of both versions with a small margin", () => {
    const crop = cropForRow({
      current: [box(0.5, 0.1)],
      proposed: [box(0.48, 0.05), box(0.55, 0.06)],
    });

    expect(crop.x).toBeCloseTo(0.09);
    expect(crop.y).toBeCloseTo(0.47);
    expect(crop.width).toBeCloseTo(0.82);
    expect(crop.height).toBeCloseTo(0.15);
  });

  it("shows the whole page if no line has a position", () => {
    expect(cropForRow({ current: [{ text: "a" }], proposed: [] })).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });
});

describe("cropStyle", () => {
  it("scales and moves the image so that only the crop is visible", () => {
    const style = cropStyle(
      { x: 0.25, y: 0.5, width: 0.5, height: 0.25 },
      { url: "/img", width: 1000, height: 800 },
    );

    expect(style.aspectRatio).toBe("500 / 200");
    expect(style.backgroundSize).toBe("200% auto");
    expect(style.backgroundPosition).toBe("50% 66.66666666666666%");
  });
});
