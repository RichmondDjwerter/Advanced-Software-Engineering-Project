"use client";

import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import Image from "next/image";
import { OCRLine } from "@/app/types/historicalRecord";

// Props the component gets from outside
type Props = {
  id: string;
  name: string;
  lines?: OCRLine[];
  imageWidth?: number | null;
  imageHeight?: number | null;
  activeLine?: number | null;
  onLineHover?: (line: number | null) => void;
};

// Function: Component itself
export function ImageWithZoom({
  id,
  name,
  lines = [],
  imageWidth,
  imageHeight,
  activeLine,
  onLineHover,
}: Props) {
  const [imageNotFound, setImageNotFound] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

  function renderImage() {
    return (
      <div
        className="relative max-h-full max-w-full overflow-auto"
        onMouseLeave={() => onLineHover?.(null)}
      >
        <div className="relative">
          <Image
            id="image-with-zoom"
            key={name}
            src={`/api/uploads?name=${encodeURIComponent(id)}.${name.split(".").pop()}`}
            alt={name}
            width={imageWidth ?? 1200}
            height={imageHeight ?? 900}
            sizes="100vw"
            loading="eager"
            className="block max-h-full w-full object-contain"
            onError={() => setImageNotFound(true)}
          />
          {lines.map((line, index) => (
            <span
              key={index}
              className={`absolute rounded-sm border-2 transition-colors ${
                activeLine === index
                  ? "border-coral bg-coral/25"
                  : "border-transparent hover:border-coral/70 hover:bg-coral/10"
              }`}
              style={{
                left: `${line.x * 100}%`,
                top: `${line.y * 100}%`,
                width: `${line.width * 100}%`,
                height: `${line.height * 100}%`,
              }}
              onMouseEnter={() => onLineHover?.(index)}
              aria-label={`Line ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <CardContent>
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground overflow-auto">
        {imageNotFound ? (
          <span>Image not found</span>
        ) : (
          <button
            type="button"
            className="h-full w-full cursor-zoom-in"
            onClick={() => setImageZoomed(true)}
            aria-label={`Zoom in on ${name}`}
          >
            {renderImage()}
          </button>
        )}
      </div>

      {imageZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={() => setImageZoomed(false)}
        >
          {renderImage()}
        </div>
      )}
    </CardContent>
  );
}
