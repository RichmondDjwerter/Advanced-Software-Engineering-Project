// Component for displaying and editing the English translation of a record. The translation is created when the transcription is saved.

"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { API_URL, updateHistoricalRecord } from "@/app/lib/api";
import { EditMode } from "@/app/components/EditMode";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  recordId: string;
};

export function EnglishTranslation({ recordId }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(
          `${API_URL}/historical_records/${encodeURIComponent(recordId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const record = await response.json();
        setText(
          typeof record.translated_text === "string"
            ? record.translated_text
            : "",
        );
        setError(false);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [recordId]);

  if (loading) {
    return (
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="flex w-full flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      </CardContent>
    );
  }

  if (error) {
    return (
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <p role="alert" className="text-sm text-destructive">
          Could not load the translation. Check that the backend is running.
        </p>
      </CardContent>
    );
  }

  return (
    <EditMode
      title="Translation"
      text={text}
      emptyMessage="No translation yet."
      onSave={async (edited) => {
        await updateHistoricalRecord(recordId, {
          translated_text: edited,
        });
        setText(edited);
      }}
    />
  );
}
