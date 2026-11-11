"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { OriginalView } from "@/app/components/OriginalView";
import { TranslationView } from "@/app/components/TranslationView";
import { DeleteButton } from "@/app/components/DeleteButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, EditIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

export default function HistoricalRecordClient({
  id,
  chat,
}: {
  id: string;
  chat: ReactNode;
}) {
  const [name, setName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const extension = name.match(/\.[^./]+$/)?.[0] ?? "";
  const editableName = extension ? name.slice(0, -extension.length) : name;

  const showError = (description: string) => {
    toast.add({
      title: "Error",
      description,
      type: "error",
    });
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecord() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/historicalRecords?id=${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to load historical record.");
        }

        const record = await response.json();

        if (typeof record.name !== "string") {
          throw new Error("Invalid record data.");
        }

        setName(record.name);
      } catch (error) {
        if (controller.signal.aborted) return;

        showError(
          error instanceof Error
            ? error.message
            : "Failed to load historical record.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRecord();

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = () => {
    setEditedName(editableName);
    setError("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditedName(editableName);
    setError("");
  };

  const saveName = async () => {
    const trimmedName = editedName.trim();

    if (!trimmedName) {
      showError("The filename cannot be empty.");
      return;
    }

    if (trimmedName.length > 255 - extension.length) {
      showError(
        `The filename is too long. Maximum length is ${
          255 - extension.length
        } characters.`,
      );
      return;
    }

    const newName = `${trimmedName}${extension}`;

    if (newName === name) {
      setEditing(false);
      setError("");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/historicalRecords?id=${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to rename record.");
      }

      setName(newName);
      setEditing(false);
    } catch (error) {
      console.error(error);
      showError("The record could not be renamed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error && !name) {
    notFound();
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/historical-records">
          <Button variant="outline" size="icon" aria-label="Go Back">
            <ArrowLeftIcon />
          </Button>
        </Link>

        <h1 className="flex min-w-0 flex-1 items-center gap-1 font-heading text-2xl font-medium tracking-tight">
          Document{" "}
          {editing ? (
            <span className="inline-flex min-w-0 flex-1 items-center gap-1">
              <Input
                ref={inputRef}
                value={editedName}
                onChange={(event) => setEditedName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveName();
                  }

                  if (event.key === "Escape") {
                    cancelEditing();
                  }
                }}
                disabled={saving}
                aria-label="Record filename"
                className="h-9 min-w-0 flex-1"
              />

              <span className="shrink-0 whitespace-nowrap">{extension}</span>

              <Button
                size="sm"
                onClick={() => void saveName()}
                disabled={saving}
                className="shrink-0"
              >
                {saving ? "Saving..." : "Save"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={cancelEditing}
                disabled={saving}
                className="shrink-0"
              >
                Cancel
              </Button>
            </span>
          ) : (
            <>
              <span className="min-w-0 truncate">{editableName}</span>
              <span className="shrink-0 whitespace-nowrap">{extension}</span>

              <Button
                variant="outline"
                size="icon"
                aria-label="Edit Record"
                onClick={startEditing}
                className="shrink-0"
              >
                <EditIcon />
              </Button>
            </>
          )}
        </h1>

        <DeleteButton id={id} redirectUrl="/historical-records" />
      </div>

      <div className="flex flex-1 flex-col justify-start gap-10 pt-4">
        <div className="grid auto-rows-[26rem] gap-6 lg:auto-rows-[clamp(24rem,58vh,34rem)] lg:grid-cols-2">
          <OriginalView
            id={id}
            activeLine={activeLine}
            onLineHover={setActiveLine}
            selectedLine={selectedLine}
            onLineClick={setSelectedLine}
          />
          <TranslationView
            recordId={id}
            activeLine={activeLine}
            onLineHover={setActiveLine}
            selectedLine={selectedLine}
            onLineClick={setSelectedLine}
          />
        </div>
        {chat}
      </div>
    </>
  );
}
