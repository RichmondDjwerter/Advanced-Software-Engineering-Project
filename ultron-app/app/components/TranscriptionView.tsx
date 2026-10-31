"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { API_URL } from "@/app/lib/api";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  recordId: string;
};

export function TranscriptionView({ recordId }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      return <Spinner className="size-8" />;
    }

    if (error) {
      return (
        <p role="alert" className="text-sm text-destructive">
          Could not load the transcription. Check that the backend is running.
        </p>
      );
    }

    if (!text.trim()) {
      return (
        <p className="text-sm text-muted-foreground">
          No text was recognized in this image.
        </p>
      );
    }

    return (
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">
        {text}
      </pre>
    );
  }
  return <CardContent>{renderContent()}</CardContent>;
}
