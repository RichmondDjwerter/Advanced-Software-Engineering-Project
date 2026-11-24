"use client";

import { useEffect, useState } from "react";
import { HistoryIcon, RotateCcwIcon } from "lucide-react";
import { API_URL } from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TranscriptionSnapshot } from "@/app/types/historicalRecord";

export function TranscriptionHistory({
  recordId,
  currentRevision,
  onRestore,
}: {
  recordId: string;
  currentRevision: number;
  onRestore: (snapshot: TranscriptionSnapshot) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<TranscriptionSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(
      `${API_URL}/historical_records/${encodeURIComponent(recordId)}/transcription-history`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Could not load transcription history.");
        const data: TranscriptionSnapshot[] = await response.json();
        setVersions(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(
            "Could not load transcription history. Check that the backend is running.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, recordId, currentRevision]);

  async function restore(snapshot: TranscriptionSnapshot) {
    setRestoring(snapshot.revision);
    setError(null);
    try {
      await onRestore(snapshot);
      setOpen(false);
    } catch {
      setError("That transcription version could not be restored.");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <HistoryIcon data-icon="inline-start" />
        History
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transcription history</DialogTitle>
            <DialogDescription>
              Earlier versions stay available. Restoring one creates a new
              current version.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            {loading && (
              <p className="text-muted-foreground">Loading versions…</p>
            )}
            {!loading && versions.length === 0 && (
              <p className="text-muted-foreground">No saved versions yet.</p>
            )}
            {versions.map((version) => {
              const isCurrent =
                version.is_current ?? version.revision === currentRevision;
              return (
                <section
                  key={version.revision}
                  className="rounded-lg border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">Version {version.revision}</h3>
                    {isCurrent && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        Current
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {version.source} ·{" "}
                      {new Date(version.created_at).toLocaleString()}
                    </span>
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-3 font-sans text-base leading-7">
                    {version.extracted_text || "(Empty transcription)"}
                  </pre>
                  {version.translated_text && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Show saved translation
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                        {version.translated_text}
                      </p>
                    </details>
                  )}
                  {!isCurrent && (
                    <Button
                      className="mt-3"
                      variant="outline"
                      disabled={restoring !== null}
                      onClick={() => void restore(version)}
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      {restoring === version.revision
                        ? "Restoring…"
                        : "Restore this version"}
                    </Button>
                  )}
                </section>
              );
            })}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={restoring !== null}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
