"use client";

import { useEffect, useRef, useState } from "react";
import { CardContent } from "@/components/ui/card";
import {
  API_URL,
  translateHistoricalRecord,
  updateHistoricalRecord,
} from "@/app/lib/api";
import { EditMode } from "@/app/components/EditMode";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

type Props = {
  recordId: string;
  activeLine: number | null;
  onLineHover: (line: number | null) => void;
  selectedLine: number | null;
  onLineClick: (line: number) => void;
};

export function TranscriptionView({
  recordId,
  activeLine,
  onLineHover,
  selectedLine,
  onLineClick,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const lineElements = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
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
  }, [selectedLine, text, loading]);

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

        const record = await response.json();
        setText(
          typeof record.extracted_text === "string"
            ? record.extracted_text
            : "",
        );
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
  }, [recordId]);

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
          await updateHistoricalRecord(recordId, { extracted_text: edited });
          setText(edited);

          // The translation follows the transcription.
          try {
            await translateHistoricalRecord(recordId, edited);
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
        renderText={() =>
          text.split(/\r?\n/).map((line, index) => (
            <span
              key={index}
              ref={(element) => {
                lineElements.current[index] = element;
              }}
              className={`block rounded-sm transition-colors hover:bg-coral/20 ${
                activeLine === index ? "bg-coral/20" : ""
              }`}
              onMouseEnter={() => onLineHover(index)}
              onMouseLeave={() => onLineHover(null)}
              onClick={() => onLineClick(index)}
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
