// Component for displaying and translating English text from OCR output, allowing users to edit the source text before translation.

"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/app/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

type Props = {
  recordId: string;
};

export function EnglishTranslation({ recordId }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [translating, setTranslating] = useState(false);
  const recordUrl = `${API_URL}/historical_records/${encodeURIComponent(recordId)}`;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(recordUrl, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const record = await response.json();
        setText(
          typeof record.translated_text === "string"
            ? record.translated_text
            : null,
        );
        setSource(
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
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [recordUrl]);

  async function translate() {
    setTranslating(true);
    try {
      const response = await fetch(`${recordUrl}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setText(data.translated_text ?? "");
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Error occurred",
        description: "Translation failed.",
        type: "error",
      });
    } finally {
      setTranslating(false);
    }
  }

  return (
    <CardContent className="flex flex-col items-start gap-4">
      {loading ? (
        <div className="flex w-full justify-center py-6">
          <Spinner className="size-8" />
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load the translation. Check that the backend is running.
        </p>
      ) : (
        <>
          <label className="flex w-full flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              Source text (editable, prefilled from OCR)
            </span>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              rows={5}
              className="w-full rounded-md border bg-transparent p-2 text-sm"
            />
          </label>
          {translating ? (
            <div className="flex w-full justify-center py-6">
              <Spinner className="size-8" />
            </div>
          ) : text?.trim() ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {text}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {text === null ? "Not translated yet." : "Nothing to translate."}
            </p>
          )}
          <Button onClick={translate} disabled={translating}>
            {translating
              ? "Translating…"
              : text === null
                ? "Translate to English"
                : "Translate again"}
          </Button>
        </>
      )}
    </CardContent>
  );
}
