import type { OCRLine } from "@/app/types/historicalRecord";
import type {
  Choice,
  ReviewLine,
  ReviewRow,
} from "@/app/types/transcriptionReview";

export function chosenLines(row: ReviewRow, choice: Choice): ReviewLine[] {
  if (choice === "proposed") return row.proposed;
  if (choice === "both") return [...row.current, ...row.proposed];
  return row.current;
}

const hasPosition = (line: ReviewLine): line is OCRLine =>
  line.x !== undefined &&
  line.y !== undefined &&
  line.width !== undefined &&
  line.height !== undefined;

/** The text and line boxes that replace the current transcription */
export function mergeTranscription(rows: ReviewRow[], choices: Choice[]) {
  const merged = rows.flatMap((row, i) => chosenLines(row, choices[i] ?? null));

  return {
    extracted_text: merged.map((line) => line.text).join("\n"),
    // text and boxes are linked by index, so it is all boxes or none
    lines: merged.every(hasPosition) ? merged : [],
  };
}
