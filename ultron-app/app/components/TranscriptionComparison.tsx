"use client";

import { useRef, useState } from "react";
import { GitCompareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { translateHistoricalRecord } from "@/app/lib/api";
import { mergeTranscription } from "@/app/components/mergeTranscription";
import { useRecordRevision } from "@/app/components/RecordRevision";
import { TranscriptionReview } from "@/app/components/TranscriptionReview";
import type { ChatProviderInfo } from "@/app/types/chat";
import type { Choice, Comparison } from "@/app/types/transcriptionReview";

/**
 * Flow: compare → bar in the chat → View diff → overwrite, or Discard.
 * Nothing is saved before the transcription is overwritten.
 */
export function useTranscriptionComparison(recordId: string) {
  const { refresh } = useRecordRevision();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Comparison | null>(null);
  const [label, setLabel] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  async function start(provider: ChatProviderInfo) {
    const controller = new AbortController();
    request.current = controller;
    setLabel(provider.label);
    setRunning(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/historicalRecords/${recordId}/compare-transcription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: provider.name }),
          signal: controller.signal,
        },
      );
      const body = await res.json().catch(() => null);
      if (controller.signal.aborted) return;

      if (!res.ok) {
        setError(body?.error ?? "The transcription is currently unavailable.");
      } else if (!Array.isArray(body?.rows) || !body?.image) {
        setError("Unexpected answer. Restart the backend.");
      } else {
        const comparison: Comparison = body;
        setResult(comparison);
        setChoices(comparison.rows.map(() => null));
      }
    } catch {
      if (!controller.signal.aborted) {
        setError("The transcription is currently unavailable.");
      }
    } finally {
      // a cancelled request must not end the one that was started after it
      if (request.current === controller) setRunning(false);
    }
  }

  function cancel() {
    request.current?.abort();
    request.current = null;
    setRunning(false);
  }

  function discard() {
    setResult(null);
    setOpen(false);
    setError(null);
  }

  async function save() {
    if (!result) return;
    const merged = mergeTranscription(result.rows, choices);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/historicalRecords?id=${encodeURIComponent(recordId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...merged,
            expected_text: result.current_text,
            revision_source: `Accepted ${label} comparison`,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "The transcription could not be saved.");
        return;
      }
    } catch {
      setError("The transcription could not be saved.");
      return;
    } finally {
      setSaving(false);
    }

    discard();
    refresh();
    toast.add({ title: "Transcription overwritten", type: "success" });

    // The translation follows the transcription.
    try {
      await translateHistoricalRecord(recordId, merged.extracted_text);
      refresh();
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Translation not updated",
        description:
          "The transcription was saved, but the translation could not be updated.",
        type: "error",
      });
    }
  }

  return {
    running,
    result,
    label,
    choices,
    setChoices,
    open,
    setOpen,
    saving,
    error,
    start,
    cancel,
    discard,
    save,
  };
}

/** The bar in the chat, and the review window it opens */
export function TranscriptionComparison({
  comparison,
}: {
  comparison: ReturnType<typeof useTranscriptionComparison>;
}) {
  const { running, result, label, choices, open, saving, error } = comparison;
  const resolved = choices.filter((choice) => choice !== null).length;

  return (
    <>
      {running && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border p-3 text-sm"
        >
          <Spinner className="size-5 text-coral" />
          <div className="min-w-0 flex-1">
            <p>{label} is transcribing the document…</p>
            {/* the model reports no progress, so the bar shows no percentage */}
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-pulse bg-coral" />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={comparison.cancel}>
            Cancel
          </Button>
        </div>
      )}

      {result && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-coral p-3 text-sm"
        >
          <GitCompareIcon className="size-5 text-coral" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {resolved ? "Review in progress" : `${label} transcription ready`}
            </p>
            <p className="text-xs text-muted-foreground">
              {resolved
                ? `${resolved} of ${result.rows.length} resolved, not saved yet`
                : "Your transcription is unchanged until you overwrite it."}
            </p>
          </div>
          <Button type="button" onClick={() => comparison.setOpen(true)}>
            View diff
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={comparison.discard}
          >
            Discard
          </Button>
        </div>
      )}

      {error && !open && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <TranscriptionReview
          open={open}
          rows={result.rows}
          image={result.image}
          label={label}
          choices={choices}
          saving={saving}
          error={error}
          onChoices={comparison.setChoices}
          onClose={() => comparison.setOpen(false)}
          onSave={() => void comparison.save()}
        />
      )}
    </>
  );
}
