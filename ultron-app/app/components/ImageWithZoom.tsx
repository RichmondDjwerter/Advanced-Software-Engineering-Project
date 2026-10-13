import { useState } from "react";
import { CardContent } from "@/components/ui/card";

// Props the component gets from outside
type Props = {
  name: string;
};

// Function: Component itself
export function ImageWithZoom({ name }: Props) {
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
            <img
              src={`http://localhost:8000/uploads/${encodeURIComponent(name)}`}
              alt={name}
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
          <img
            src={`http://localhost:8000/uploads/${encodeURIComponent(name)}`}
            alt={name}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-4 text-2xl text-white"
            onClick={() => setImageZoomed(false)}
            aria-label="Close zoomed image"
          >
          </button>
        </div>
      )}
    </CardContent>
  );
}