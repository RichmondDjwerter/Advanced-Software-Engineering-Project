"use client";

import { Fragment } from "react";
import { ChevronsLeftIcon, ChevronsRightIcon, Undo2Icon } from "lucide-react";
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
import { chosenLines } from "@/app/components/mergeTranscription";
import type {
  Choice,
  ComparisonImage,
  ReviewLine,
  ReviewRow,
} from "@/app/types/transcriptionReview";

const currentColor = "bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100";
const proposedColor =
  "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100";

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

/**
 * Current on the left, the proposal of the model on the right. The middle shows
 * the part of the page of each row, and below it the version that was chosen.
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

  const choose = (index: number, choice: Choice) =>
    onChoices(choices.map((old, i) => (i === index ? choice : old)));
  const chooseAll = (choice: Choice) => onChoices(rows.map(() => choice));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-6xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Review transcription</DialogTitle>
          <DialogDescription>
            Choose which version each line uses. {resolved} of {rows.length}{" "}
            resolved.
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

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
          <div className="grid min-w-[56rem] grid-cols-[2rem_1fr_1.4fr_1fr]">
            {["#", "Current", "Result", label].map((title, column) => (
              <div
                key={column}
                className={`sticky top-0 z-10 border-b p-2 font-medium ${
                  column === 1
                    ? currentColor
                    : column === 3
                      ? proposedColor
                      : "bg-popover"
                }`}
              >
                {title}
              </div>
            ))}

            {rows.map((row, index) => {
              const choice = choices[index];
              const crop = cropForRow(row);
              const wholePage = crop.width === 1 && crop.height === 1;
              return (
                <Fragment key={index}>
                  <div className="border-b p-2 text-muted-foreground">
                    {index + 1}
                  </div>

                  <div
                    className={`flex items-start gap-2 border-b p-2 ${
                      choice === "current" || choice === "both"
                        ? currentColor
                        : choice === "proposed"
                          ? "text-muted-foreground"
                          : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <Lines lines={row.current} />
                    </div>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Use current for row ${index + 1}`}
                      disabled={saving}
                      onClick={() => choose(index, "current")}
                    >
                      <ChevronsRightIcon />
                    </Button>
                  </div>

                  <div
                    data-result
                    className="flex flex-col gap-2 border-x border-b p-2"
                  >
                    <div
                      data-crop
                      role="img"
                      aria-label={`Part of the page for row ${index + 1}`}
                      className={`w-full rounded border bg-muted ${wholePage ? "max-w-xs self-center" : ""}`}
                      style={cropStyle(crop, imageInfo)}
                    />

                    <div className="flex items-start gap-2">
                      {choice === null ? (
                        <>
                          <span className="min-w-0 flex-1 text-muted-foreground">
                            Unresolved
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Use both for row ${index + 1}`}
                            disabled={saving}
                            onClick={() => choose(index, "both")}
                          >
                            Both
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`mb-1 inline-block rounded px-1.5 text-xs ${
                                choice === "proposed"
                                  ? proposedColor
                                  : choice === "current"
                                    ? currentColor
                                    : "border"
                              }`}
                            >
                              {choice === "proposed" ? label : choice}
                            </span>
                            <Lines lines={chosenLines(row, choice)} />
                          </div>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Undo choice for row ${index + 1}`}
                            disabled={saving}
                            onClick={() => choose(index, null)}
                          >
                            <Undo2Icon />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    className={`flex items-start gap-2 border-b p-2 ${
                      choice === "proposed" || choice === "both"
                        ? proposedColor
                        : choice === "current"
                          ? "text-muted-foreground"
                          : ""
                    }`}
                  >
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Use ${label} for row ${index + 1}`}
                      disabled={saving}
                      onClick={() => choose(index, "proposed")}
                    >
                      <ChevronsLeftIcon />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <Lines lines={row.proposed} />
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>

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
