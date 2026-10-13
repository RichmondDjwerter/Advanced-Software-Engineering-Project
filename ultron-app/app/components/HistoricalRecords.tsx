"use client";

import { useEffect, useState } from "react";
import { RecordCard } from "@/app/components/RecordCard";
import { UploadButton } from "@/app/components/UploadButton";

type HistoricalRecord = {
  id: string | number;
  name: string;
  description: string;
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
      <h1 className="font-heading text-2xl font-medium tracking-tight">Historical Records</h1>

      <div className="flex justify-end">
        <UploadButton />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => (
          <RecordCard
            key={record.id}
            id={String(record.id)}
            name={record.name}
            description={record.description}
          />
        ))}
      </div>
    </>
  );
}
