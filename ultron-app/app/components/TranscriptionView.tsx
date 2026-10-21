"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_URL } from "@/app/lib/api";

type Props = {
  recordId: string;
};

export function TranscriptionView({ recordId }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setError(null);
      } catch {
        if (!controller.signal.aborted) {
          setError(
            "Could not load the transcription. Check that the backend is running.",
          );
        }
      }
    }

    void loadTranscription();
    return () => controller.abort();
  }, [recordId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>OCR transcription</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : text === null ? (
          <p className="text-sm text-muted-foreground">
            Loading transcription…
          </p>
        ) : text.trim() ? (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">
            {text}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            No text was recognized in this image.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
