"use client";

import { useEffect, useRef, useState } from "react";
import { CardContent } from "@/components/ui/card";
import {
  API_URL,
  detectHistoricalRecordLanguage,
  translateHistoricalRecord,
  updateHistoricalRecord,
} from "@/app/lib/api";
import { EditMode } from "@/app/components/EditMode";
import { TranscriptionHistory } from "@/app/components/TranscriptionHistory";
import { useRecordRevision } from "@/app/components/RecordRevision";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { HistoricalRecord } from "@/app/types/historicalRecord";

type Props = {
  recordId: string;
  isActive: boolean;
  activeLine: number | null;
  onLineHover: (line: number | null) => void;
  selectedLine: number | null;
  selectionVersion: number;
  onLineClick: (line: number) => void;
};

export function TranscriptionView({
  recordId,
  isActive,
  activeLine,
  onLineHover,
  selectedLine,
  selectionVersion,
  onLineClick,
}: Props) {
  const { revision, refresh } = useRecordRevision();
  const [text, setText] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [transcriptionRevision, setTranscriptionRevision] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const lineElements = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!isActive) return;
    const line =
      selectedLine === null ? null : lineElements.current[selectedLine];
    const container = line?.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );

    if (!line || !container) return;

    const containerRect = container.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const verticalOffset =
      lineRect.top +
      lineRect.height / 2 -
      (containerRect.top + containerRect.height / 2);

    container.scrollBy({
      top: verticalOffset,
      behavior: "smooth",
    });
  }, [selectedLine, selectionVersion, text, loading, isActive]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTranscription() {
      try {
        const response = await fetch(
          `${API_URL}/historical_records/${encodeURIComponent(recordId)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Could not load the transcription.");
        }

        const record: HistoricalRecord = await response.json();
        setTranscriptionRevision(record.transcription_revision ?? 1);
        const transcription =
          typeof record.extracted_text === "string"
            ? record.extracted_text
            : "";
        setText(transcription);
        let language =
          typeof record.detected_language === "string"
            ? record.detected_language
            : null;

        if (!language && transcription.trim()) {
          try {
            language = await detectHistoricalRecordLanguage(recordId);
          } catch (error) {
            console.error(error);
          }
        }

        setDetectedLanguage(language);
        setError(false);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadTranscription();
    return () => controller.abort();
  }, [recordId, revision]);

  function renderContent() {
    if (loading) {
      return (
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-8" />
          </div>
        </CardContent>
      );
    }

    if (error) {
      return (
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <p role="alert" className="m-auto text-sm text-destructive">
            Could not load the transcription. Check that the backend is running.
          </p>
        </CardContent>
      );
    }

    return (
      <EditMode
        title="Transcription"
        text={text}
        emptyMessage="No text was recognized in this image."
        onSave={async (edited) => {
          await updateHistoricalRecord(recordId, {
            extracted_text: edited,
            revision_source: "Manual edit",
          });
          setText(edited);
          refresh();

          // The translation follows the transcription.
          try {
            setDetectedLanguage(
              await translateHistoricalRecord(recordId, edited),
            );
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
        }}
        actions={
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <TranscriptionHistory
              recordId={recordId}
              currentRevision={transcriptionRevision}
              onRestore={async (snapshot) => {
                await updateHistoricalRecord(recordId, {
                  extracted_text: snapshot.extracted_text,
                  lines: snapshot.lines ?? [],
                  revision_source: `Restored version ${snapshot.revision}`,
                });
                setText(snapshot.extracted_text);
                refresh();
                try {
                  setDetectedLanguage(
                    await translateHistoricalRecord(
                      recordId,
                      snapshot.extracted_text,
                    ),
                  );
                  refresh();
                } catch (err) {
                  console.error(err);
                  toast.add({
                    title: "Translation not updated",
                    description:
                      "The transcription was restored, but its translation could not be refreshed.",
                    type: "error",
                  });
                }
              }}
            />
            <span
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {detectedLanguage
                ? `Detected: ${detectedLanguage}`
                : "Language not detected"}
            </span>
          </div>
        }
        renderText={() =>
          text.split(/\r?\n/).map((line, index) => (
            <span
              key={index}
              ref={(element) => {
                lineElements.current[index] = element;
              }}
              role="button"
              tabIndex={0}
              aria-label={`Scroll to line ${index + 1} in the manuscript image`}
              aria-pressed={selectedLine === index}
              className={`block cursor-pointer rounded-sm transition-colors hover:bg-coral/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral ${
                activeLine === index || selectedLine === index
                  ? "bg-coral/20 outline outline-1 outline-coral/50"
                  : ""
              }`}
              onMouseEnter={() => onLineHover(index)}
              onMouseLeave={() => onLineHover(null)}
              onClick={() => onLineClick(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onLineClick(index);
                }
              }}
            >
              {line || " "}
            </span>
          ))
        }
      />
    );
  }

  return renderContent();
}
