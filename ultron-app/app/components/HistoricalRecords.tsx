"use client";

import { useEffect, useState } from "react";
import { RecordCard } from "@/app/components/RecordCard";
import { UploadButton } from "@/app/components/UploadButton";

type HistoricalRecord = {
  id: string | number;
  name: string;
  description: string;
  image_filename: string | null;
};

export default function HistoricalRecords() {
  const [records, setRecords] = useState<HistoricalRecord[]>([]);

  useEffect(() => {
    const loadRecords = async () => {
      const response = await fetch("/api/historicalRecord");

      if (!response.ok) {
        throw new Error("Failed to load historical records");
      }

      setRecords(await response.json());
    };

    loadRecords().catch(console.error);
  }, []);

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
        <UploadButton />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => (
          <RecordCard
          key={record.id}
          id={String(record.id)}
          name={record.name}
          description={record.description}
          imageFilename={record.image_filename}
/>
        ))}
      </div>
    </>
  );
}
