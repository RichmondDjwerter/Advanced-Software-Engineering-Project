import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
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
            className="h-full w-full rounded-lg object-contain"
            onError={() => setImageNotFound(true)}
          />
          <button
            type="button"
            className="absolute top-5 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={() => setImageZoomed(false)}
            aria-label="Close zoomed image"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </CardContent>
  );
}
