import { describe, expect, it } from "vitest";

import { mergeTranscription } from "./mergeTranscription";

const box = (text: string) => ({ text, x: 0, y: 0, width: 1, height: 0.1 });
const rows = [
  { current: [box("c1")], proposed: [box("g1")] },
  { current: [box("c2")], proposed: [box("g2a"), box("g2b")] },
  { current: [box("c3")], proposed: [box("g3")] },
];

describe("mergeTranscription", () => {
  it("uses the choice of each row and keeps current for unresolved rows", () => {
    const merged = mergeTranscription(rows, ["proposed", "both", null]);

    expect(merged.extracted_text).toBe("g1\nc2\ng2a\ng2b\nc3");
    expect(merged.lines.map((line) => line.text)).toEqual(
      merged.extracted_text.split("\n"),
    );
  });

  it("drops all boxes if one position is unknown", () => {
    const merged = mergeTranscription(
      [{ current: [{ text: "edited" }], proposed: [box("g")] }],
      ["both"],
    );

    expect(merged).toEqual({ extracted_text: "edited\ng", lines: [] });
  });
});
