import type { ReviewLine, ReviewRow } from "@/app/types/transcriptionReview";

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A little room around the lines, because the boxes of a model are estimates */
const MARGIN = 0.01;

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * The part of the page that shows all lines of a row, as fractions of the page.
 * Returns the whole page if no line of the row has a position.
 */
export function cropForRow(row: ReviewRow): Crop {
  const boxes = [...row.current, ...row.proposed].filter(
    (line): line is Required<ReviewLine> =>
      line.x !== undefined &&
      line.y !== undefined &&
      line.width !== undefined &&
      line.height !== undefined,
  );
  if (boxes.length === 0) return { x: 0, y: 0, width: 1, height: 1 };

  const left = clamp(Math.min(...boxes.map((b) => b.x)) - MARGIN);
  const top = clamp(Math.min(...boxes.map((b) => b.y)) - MARGIN);
  const right = clamp(Math.max(...boxes.map((b) => b.x + b.width)) + MARGIN);
  const bottom = clamp(Math.max(...boxes.map((b) => b.y + b.height)) + MARGIN);

  return {
    x: left,
    y: top,
    width: Math.max(right - left, 0.01),
    height: Math.max(bottom - top, 0.01),
  };
}

/**
 * CSS that shows only the crop of the image: the image is scaled so that the
 * crop fills the element, and moved so that the crop is in view.
 */
export function cropStyle(
  crop: Crop,
  image: { url: string; width: number; height: number },
) {
  // background-position in % means: x% of the free space, not of the image
  const position = (start: number, size: number) =>
    size >= 1 ? 0 : (start / (1 - size)) * 100;

  return {
    aspectRatio: `${crop.width * image.width} / ${crop.height * image.height}`,
    backgroundImage: `url("${image.url}")`,
    backgroundSize: `${100 / crop.width}% auto`,
    backgroundPosition: `${position(crop.x, crop.width)}% ${position(crop.y, crop.height)}%`,
    backgroundRepeat: "no-repeat",
  };
}
