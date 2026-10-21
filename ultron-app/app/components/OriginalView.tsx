"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageWithZoom } from "@/app/components/ImageWithZoom";
import { useEffect, useState } from "react";
import { HistoricalRecord } from "@/app/types/historicalRecord";

// Props for the OriginalView component
type OriginalViewProps = {
  id: string;
};

// Component to display the image of a historical record
export function OriginalView({ id }: OriginalViewProps) {
  const [imageNotFound, setImageNotFound] = useState(false);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);

  useEffect(() => {
    setImageNotFound(false);
    setImageName(null);
    setImageFilename(null);
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

        const record = await response.json();
        const name = record.name;
        const filename = record.image_filename;

        if (typeof name !== "string" || !name.trim()) {
          throw new Error("Historical record has no original image");
        }

        setImageName(name.trim());
        setImageFilename(
          typeof filename === "string" && filename.trim() ? filename.trim() : null,
        );
      } catch {
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
      <ImageWithZoom
        name={imageNotFound ? "Image not found" : imageName || "Loading..."}
        imageFilename={imageFilename}
      />

      {record && <ImageWithZoom key={id} id={id} name={record.name} />}
    </Card>
  );
}
