"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageWithZoom } from "@/app/components/ImageWithZoom";
import { useEffect, useState } from "react";
import { HistoricalRecord } from "@/app/types/historicalRecord";

// Props for the OriginalView component
type OriginalViewProps = {
  id: string;
  activeLine: number | null;
  onLineHover: (line: number | null) => void;
  selectedLine: number | null;
  onLineClick: (line: number) => void;
};

// Component to display the image of a historical record
export function OriginalView({
  id,
  activeLine,
  onLineHover,
  selectedLine,
  onLineClick,
}: OriginalViewProps) {
  const [record, setRecord] = useState<HistoricalRecord | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadRecord = async () => {
      try {
        const response = await fetch(
          `/api/historicalRecords?id=${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to load historical record");
        }

        const data: HistoricalRecord = await response.json();
        setRecord(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
        }
      }
    };

    loadRecord();

    return () => controller.abort();
  }, [id]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Original</CardTitle>
      </CardHeader>

      {record && (
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <ImageWithZoom
            key={id}
            id={id}
            name={record.name}
            lines={record.lines}
            imageWidth={record.image_width}
            imageHeight={record.image_height}
            activeLine={activeLine}
            onLineHover={onLineHover}
            selectedLine={selectedLine}
            onLineClick={onLineClick}
          />
        </div>
      )}
    </Card>
  );
}
