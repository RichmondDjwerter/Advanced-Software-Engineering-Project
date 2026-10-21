"use client";

import { useEffect, useState } from "react";
import { CardContent } from "@/components/ui/card";
import { API_URL } from "@/app/lib/api";
import Image from "next/image";

type Props = {
  id: string;
  name: string;
  imageFilename?: string | null;
};

export function ImageWithZoom({ name, imageFilename }: Props) {
// Function: Component itself
export function ImageWithZoom({ id, name }: Props) {
  const [imageNotFound, setImageNotFound] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

  useEffect(() => {
    setImageNotFound(false);
    setImageZoomed(false);
  }, [imageFilename]);

  const imageUrl = imageFilename
    ? `${API_URL}/uploads/${encodeURIComponent(imageFilename)}`
    : null;

  return (
    <CardContent>
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {!imageUrl ? (
          <span>{name === "Loading..." ? "Loading image…" : "Image filename unavailable"}</span>
        ) : imageNotFound ? (
          <span>Image not found</span>
        ) : (
          <button
            type="button"
            className="h-full w-full cursor-zoom-in"
            onClick={() => setImageZoomed(true)}
            aria-label={`Zoom in on ${name}`}
          >
            <img
              src={imageUrl}
            <Image
              key={name}
              src={`/api/uploads?name=${encodeURIComponent(id)}.${name.split(".").pop()}`}
              alt={name}
              width={0}
              height={0}
              sizes="100vw"
              loading="eager"
              className="h-full w-full rounded-lg object-contain"
              onError={() => setImageNotFound(true)}
            />
          </button>
        )}
      </div>

      {imageZoomed && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={() => setImageZoomed(false)}
        >
          <img
            src={imageUrl}
          <Image
            key={name}
            src={`/api/uploads?name=${encodeURIComponent(id)}.${name.split(".").pop()}`}
            alt={name}
            width={0}
            height={0}
            sizes="100vw"
            loading="eager"
            className="h-full w-full rounded-lg object-contain"
            onError={() => setImageNotFound(true)}
          />
          <button
            type="button"
            className="absolute right-4 top-4 text-2xl text-white"
            onClick={() => setImageZoomed(false)}
            aria-label="Close zoomed image"
          >
            ×
          </button>
        </div>
      )}
    </CardContent>
  );
}
