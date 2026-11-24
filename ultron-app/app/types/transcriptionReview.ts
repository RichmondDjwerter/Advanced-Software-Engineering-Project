import type { OCRLine } from "@/app/types/historicalRecord";

/** A line of text. The position is missing if it is unknown. */
export type ReviewLine = Pick<OCRLine, "text"> & Partial<OCRLine>;

export interface ReviewRow {
  current: ReviewLine[];
  /** lines of the model that made the proposal */
  proposed: ReviewLine[];
}

/** The stored source image and its size in pixels */
export interface ComparisonImage {
  name: string;
  width: number;
  height: number;
}

export interface Comparison {
  /** The transcription that was compared, to detect edits made in the meantime */
  current_text: string;
  rows: ReviewRow[];
  image: ComparisonImage;
}

/** null: not decided yet, which keeps the current text */
export type Choice = "current" | "proposed" | "both" | null;
