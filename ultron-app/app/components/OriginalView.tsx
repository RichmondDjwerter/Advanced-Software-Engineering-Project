"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageWithZoom } from "@/app/components/ImageWithZoom";
import { useEffect, useState } from "react";
import { API_URL } from "@/app/lib/api";

type OriginalViewProps = {
  id: string;
};

export function OriginalView({ id }: OriginalViewProps) {
  const [imageNotFound, setImageNotFound] = useState(false);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);

  useEffect(() => {
    setImageNotFound(false);
    setImageName(null);
    setImageFilename(null);
    const controller = new AbortController();

    const fetchHistoricalRecord = async () => {
      try {
        const response = await fetch(
          `${API_URL}/historical_records/${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Historical record not found");
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
        if (!controller.signal.aborted) {
          setImageNotFound(true);
        }
      }
    };

    fetchHistoricalRecord();

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
    </Card>
  );
}
