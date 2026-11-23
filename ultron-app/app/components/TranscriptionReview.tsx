"use client";

import type { ReactNode } from "react";
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropForRow, cropStyle } from "@/app/components/imageCrop";
import type {
  Choice,
  ComparisonImage,
  ReviewLine,
  ReviewRow,
} from "@/app/types/transcriptionReview";

const currentColor =
  "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100";
const proposedColor =
  "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100";

function Lines({ lines }: { lines: ReviewLine[] }) {
  if (lines.length === 0) {
    return <span className="text-muted-foreground italic">No line</span>;
  }
  return lines.map((line, index) => (
    <span key={index} className="block break-words">
      {line.text || " "}
    </span>
  ));
}

/** One version of a row. Clicking it again removes the choice. */
function Option({
  title,
  selected,
  color,
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  title: string;
  selected: boolean;
  color: string;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-w-0 flex-col gap-1 rounded-lg border p-2 text-left transition-colors disabled:opacity-60 ${
        selected ? `${color} ring-2 ring-coral` : "border-border hover:bg-muted"
      }`}
    >
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      {children}
    </button>
  );
}

/**
 * Shows each part of the page with the current and the proposed transcription
 * below it. Choose per row, then overwrite the current transcription.
 */
export function TranscriptionReview({
  open,
  rows,
  image,
  label,
  choices,
  saving,
  error,
  onChoices,
  onClose,
  onSave,
}: {
  open: boolean;
  rows: ReviewRow[];
  image: ComparisonImage;
  /** name of the model that made the proposal */
  label: string;
  choices: Choice[];
  saving: boolean;
  error: string | null;
  onChoices: (choices: Choice[]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const resolved = choices.filter((choice) => choice !== null).length;
  const changed = choices.some((c) => c === "proposed" || c === "both");
  const imageInfo = {
    url: `/api/uploads?name=${encodeURIComponent(image.name)}`,
    width: image.width,
    height: image.height,
  };

  // clicking the chosen version again makes the row unresolved
  const choose = (index: number, choice: Choice) =>
    onChoices(
      choices.map((old, i) =>
        i !== index ? old : old === choice ? null : choice,
      ),
    );
  const chooseAll = (choice: Choice) => onChoices(rows.map(() => choice));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Review transcription</DialogTitle>
          <DialogDescription>
            Compare each part of the page with both transcriptions and choose
            one. {resolved} of {rows.length} resolved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => chooseAll("current")}
          >
            Accept all current
            <ChevronsRightIcon data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => chooseAll("proposed")}
          >
            <ChevronsLeftIcon data-icon="inline-start" />
            Accept all {label}
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => chooseAll(null)}
          >
            Reset
          </Button>
        </div>

        <ol className="min-h-0 flex-1 overflow-auto rounded-lg border">
          {rows.map((row, index) => {
            const choice = choices[index];
            const crop = cropForRow(row);
            const wholePage = crop.width === 1 && crop.height === 1;
            return (
              <li
                key={index}
                className="flex flex-col gap-2 border-b p-3 last:border-b-0"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{index + 1}</span>
                  <span>
                    {choice === null
                      ? "Unresolved, keeps current"
                      : choice === "proposed"
                        ? `Uses ${label}`
                        : choice === "both"
                          ? "Uses both"
                          : "Uses current"}
                  </span>
                </div>

                <div
                  data-crop
                  role="img"
                  aria-label={`Part of the page for row ${index + 1}`}
                  className={`w-full rounded border bg-muted ${wholePage ? "max-w-sm" : ""}`}
                  style={cropStyle(crop, imageInfo)}
                />

                <div className="grid gap-2 sm:grid-cols-3">
                  <Option
                    title="Current"
                    selected={choice === "current"}
                    color={currentColor}
                    ariaLabel={`Use current for row ${index + 1}`}
                    disabled={saving}
                    onClick={() => choose(index, "current")}
                  >
                    <Lines lines={row.current} />
                  </Option>
                  <Option
                    title={label}
                    selected={choice === "proposed"}
                    color={proposedColor}
                    ariaLabel={`Use ${label} for row ${index + 1}`}
                    disabled={saving}
                    onClick={() => choose(index, "proposed")}
                  >
                    <Lines lines={row.proposed} />
                  </Option>
                  <Option
                    title="Both"
                    selected={choice === "both"}
                    color="border-border bg-muted"
                    ariaLabel={`Use both for row ${index + 1}`}
                    disabled={saving}
                    onClick={() => choose(index, "both")}
                  >
                    <span className="text-muted-foreground">
                      Current, then {label}
                    </span>
                  </Option>
                </div>
              </li>
            );
          })}
        </ol>

        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="sm:items-center">
          <p className="text-muted-foreground sm:mr-auto">
            Overwrites the current transcription. Unresolved rows keep the
            current text.
          </p>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Close
          </Button>
          <Button
            className="bg-coral text-white hover:bg-coral/85"
            disabled={saving || !changed}
            onClick={onSave}
          >
            {saving ? "Saving..." : "Overwrite transcription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
