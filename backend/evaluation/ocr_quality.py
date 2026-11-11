"""OCR quality gate.

Reads a fixed sample of CATMuS Medieval test lines with the configured OCR
model (ocr.read_line) and fails if the character error rate (CER) is above
the allowed maximum. Run from the backend folder:

    uv run python -m evaluation.ocr_quality --lines 20 --max-cer 0.30

The sample is the team's benchmark (1 line out of every 50 of the test
split, 300 lines), thinned out evenly to --lines lines, so it always covers
the same manuscripts and languages.
"""

import argparse
import itertools
import json
import sys
import time
from pathlib import Path
from typing import Any

from evaluation.metrics import error_rates, normalise

BENCHMARK_STEP = 50
BENCHMARK_SIZE = 300


def load_sample(n_lines: int) -> list[dict[str, Any]]:
    from datasets import load_dataset  # type: ignore[import-untyped]

    stream = load_dataset("CATMuS/medieval", split="test", streaming=True)
    benchmark = list(
        itertools.islice(
            (row for i, row in enumerate(stream) if i % BENCHMARK_STEP == 0),
            BENCHMARK_SIZE,
        )
    )
    stride = max(1, len(benchmark) // n_lines)
    return benchmark[::stride][:n_lines]


def evaluate(n_lines: int) -> dict[str, Any]:
    import ocr

    rows = load_sample(n_lines)
    truths = [row["text"].strip() for row in rows]

    start = time.time()
    predictions = [ocr.read_line(row["im"]) for row in rows]
    seconds_per_line = (time.time() - start) / max(len(rows), 1)

    cer, wer = error_rates(truths, predictions)
    return {
        "config": ocr.ocr_config(),
        "lines": len(rows),
        "languages": sorted({row["language"] for row in rows}),
        "cer": cer,
        "wer": wer,
        "seconds_per_line": seconds_per_line,
        "examples": [
            {"truth": normalise(t), "prediction": normalise(p)}
            for t, p in list(zip(truths, predictions, strict=True))[:5]
        ],
    }


def markdown_summary(report: dict[str, Any], max_cer: float, passed: bool) -> str:
    status = "PASSED" if passed else "FAILED"
    model_id = report["config"]["model_id"]
    row = (
        f"| `{model_id}` | {report['lines']} | {report['cer']:.1%} | {max_cer:.1%} "
        f"| {report['wer']:.1%} | {report['seconds_per_line']:.2f} |"
    )
    lines = [
        f"## OCR quality gate: {status}",
        "",
        "| Model | Lines | CER | Max allowed CER | WER | Seconds per line |",
        "| --- | --- | --- | --- | --- | --- |",
        row,
        "",
        f"Languages: {', '.join(report['languages'])}",
    ]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--lines", type=int, default=20, help="number of test lines")
    parser.add_argument(
        "--max-cer", type=float, default=0.30, help="highest CER allowed"
    )
    parser.add_argument("--report", type=Path, default=Path("ocr_quality_report.json"))
    parser.add_argument(
        "--summary", type=Path, help="also write a Markdown summary here"
    )
    args = parser.parse_args(argv)

    report = evaluate(args.lines)
    passed = report["cer"] <= args.max_cer
    report.update({"max_cer": args.max_cer, "passed": passed})

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    summary = markdown_summary(report, args.max_cer, passed)
    print(summary)
    if args.summary:
        with args.summary.open("a", encoding="utf-8") as handle:
            handle.write(summary + "\n")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
