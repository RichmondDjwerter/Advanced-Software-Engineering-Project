"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { RecordCard } from "@/app/components/RecordCard";
import { UploadButton } from "@/app/components/UploadButton";
import { HistoricalRecord } from "@/app/types/historicalRecord";
import { Spinner } from "@/components/ui/spinner";

export default function HistoricalRecords() {
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const response = await fetch("/api/historicalRecords");

      if (!response.ok) {
        throw new Error("Failed to load historical records");
      }
      setRecords(await response.json());
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = records.filter((record) =>
    record.name
      .toLocaleLowerCase()
      .includes(searchQuery.trim().toLocaleLowerCase()),
  );

  function renderContent() {
    // display spinner while content is loading
    if (loading) {
      return (
        <div className="col-span-full flex min-h-48 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      );
    }

    if (error) {
      return (
        <div
          role="alert"
          className="col-span-full flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center shadow-sm"
        >
          <p className="text-base font-medium text-foreground">
            Failed to load historical records.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please refresh the page or try again later.
          </p>
        </div>
      );
    }

    if (filteredRecords.length === 0) {
      return (
        <div className="col-span-full flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center shadow-sm">
          <p className="text-base font-medium text-foreground">
            {records.length === 0
              ? "No historical records found"
              : "No matching historical records found"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.length === 0
              ? "Please upload an image to get started."
              : "Try a different search term."}
          </p>
        </div>
      );
    }

    return filteredRecords.map((record) => (
      <RecordCard
        key={record.id}
        id={String(record.id)}
        name={record.name}
        description={record.description}
      />
    ));
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Historical Records
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse your uploaded documents and open one to work with it.
          </p>
        </div>

        <UploadButton onUploadSuccess={loadRecords} />
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Filter historical records"
          aria-label="Filter historical records"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {renderContent()}
      </div>
    </>
  );
}
