"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageWithZoom } from "@/app/components/ImageWithZoom";
import { useEffect, useState } from "react";
import { HistoricalRecord } from "@/app/types/historicalRecord";

type OriginalViewProps = {
  id: string;
};


export function OriginalView({ id }: OriginalViewProps) {
  const [imageNotFound, setImageNotFound] = useState(false);

  const [record, setRecord] = useState<HistoricalRecord>({} as HistoricalRecord);
  
  useEffect(() => {
    const loadRecord = async () => {
      const response = await fetch(`/api/historicalRecords?id=${id}`);

      if (!response.ok) {
        throw new Error("Failed to load historical records");
      }

      setRecord(await response.json());
      setImageNotFound(false);
    };
    loadRecord().catch(console.error);
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Original</CardTitle>
      </CardHeader>
      <ImageWithZoom id={id} name={imageNotFound ? "Image not found" : record.name || "Loading..."}
      />
    </Card>
  );
}
