"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { OriginalView } from "@/app/components/OriginalView";
import { TranslationView } from "@/app/components/TranslationView";
import { Chat } from "@/app/components/Chat";
import { DeleteButton } from "@/app/components/DeleteButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, EditIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default function HistoricalRecordPage(
  props: PageProps<"/historical-records/[id]">
) {
  const { id } = use(props.params);

  const [name, setName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const extension = name.match(/\.[^./]+$/)?.[0] ?? "";
  const editableName = extension
    ? name.slice(0, -extension.length)
    : name;

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecord() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/historicalRecords?id=${encodeURIComponent(id)}`,
          { signal: controller.signal }
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

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load historical record."
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
      setError("The filename cannot be empty.");
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
        }
      );

      if (!response.ok) {
        throw new Error("Failed to rename record.");
      }

      setName(newName);
      setEditing(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to rename record."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading record...</p>;
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

        <h1 className="flex items-center gap-1 font-heading text-2xl font-medium tracking-tight">
          Document{" "}

          {editing ? (
            <span className="inline-flex items-center gap-1">
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
                className="h-9 w-48"
              />

              <span>{extension}</span>

              <Button
                size="sm"
                onClick={() => void saveName()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </Button>
            </span>
          ) : (
            <>
              <span>{editableName}{extension}</span>

              <Button
                variant="outline"
                size="icon"
                aria-label="Edit Record"
                onClick={startEditing}
              >
                <EditIcon />
              </Button>
            </>
          )}
        </h1>

        <DeleteButton
          id={id}
          redirectUrl="/historical-records"
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-1 flex-col justify-center gap-10 pb-20">
        <div className="grid gap-4 lg:grid-cols-2">
          <OriginalView id={id} />
          <TranslationView />
        </div>

        <Chat recordId={id} />
      </div>
    </>
  );
}