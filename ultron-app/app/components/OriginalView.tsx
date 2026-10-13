"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ImageWithZoom } from "@/app/components/ImageWithZoom";
import { useEffect, useState } from "react";

type OriginalViewProps = {
  id: string;
};

export function OriginalView({ id }: OriginalViewProps) {
  const [imageNotFound, setImageNotFound] = useState(false);
  const [imageName, setImageName] = useState<string | null>(null);

  useEffect(() => {
    setImageNotFound(false);
    setImageName(null);

    const fetchHistoricalRecord = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/historical_records/${encodeURIComponent(id)}`,
        );

        if (!response.ok) {
          throw new Error("Historical record not found");
        }

        const record = await response.json();
        const name = record.name;

        if (typeof name !== "string" || !name.trim()) {
          throw new Error("Historical record has no original image");
        }

        setImageName(name.trim());
      } catch {
        setImageNotFound(true);
      }
    };

    fetchHistoricalRecord();
  }, [id]);

  const imageUrl = imageName
    ? imageName.startsWith("http://") || imageName.startsWith("https://")
      ? imageName
      : `http://localhost:8000/uploads/${imageName
          .split("/")
          .map((part: string) => encodeURIComponent(part))
          .join("/")}`
    : null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Original</CardTitle>
      </CardHeader>
      <ImageWithZoom name={imageName || "Image not found"} />
    </Card>
  );
}
