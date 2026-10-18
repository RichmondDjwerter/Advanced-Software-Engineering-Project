import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import Image from "next/image";

// Props the component gets from outside
type Props = {
  id: string;
  name: string;
};

// Function: Component itself
export function ImageWithZoom({ id, name }: Props) {
  const [imageNotFound, setImageNotFound] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

  return (
    <CardContent>
      <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {imageNotFound ? (
          <span>Image not found</span>
        ) : (
          <button
            type="button"
            className="h-full w-full cursor-zoom-in"
            onClick={() => setImageZoomed(true)}
            aria-label={`Zoom in on ${name}`}
          >
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

      {imageZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={() => setImageZoomed(false)}
        >
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
        </div>
      )}
    </CardContent>
  );
}