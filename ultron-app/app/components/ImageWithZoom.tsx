"use client";

import { useEffect, useRef, useState } from "react";
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
  selectedLine?: number | null;
  onLineClick?: (line: number) => void;
};

function scrollSelectedLine(
  container: HTMLDivElement | null,
  selectedLine: number | null | undefined,
) {
  if (selectedLine === null || selectedLine === undefined || !container) {
    return;
  }

  const line = container.querySelector<HTMLElement>(
    `[data-line-index="${selectedLine}"]`,
  );

  if (!line) return;

  const containerRect = container.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();

  container.scrollBy({
    top:
      lineRect.top +
      lineRect.height / 2 -
      (containerRect.top + containerRect.height / 2),
    left:
      lineRect.left +
      lineRect.width / 2 -
      (containerRect.left + containerRect.width / 2),
    behavior: "smooth",
  });
}

// Function: Component itself
export function ImageWithZoom({
  id,
  name,
  lines = [],
  imageWidth,
  imageHeight,
  activeLine,
  onLineHover,
  selectedLine,
  onLineClick,
}: Props) {
  const [imageNotFound, setImageNotFound] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const imageScrollContainers = useRef<{
    card: HTMLDivElement | null;
    zoom: HTMLDivElement | null;
  }>({ card: null, zoom: null });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollSelectedLine(imageScrollContainers.current.card, selectedLine);
      scrollSelectedLine(imageScrollContainers.current.zoom, selectedLine);
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedLine, imageZoomed, lines]);

  function renderImage() {
    return (
      <div
        ref={(element) => {
          imageScrollContainers.current[imageZoomed ? "zoom" : "card"] =
            element;
        }}
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
              data-line-index={index}
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
              onClick={(event) => {
                event.stopPropagation();
                onLineClick?.(index);
              }}
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
