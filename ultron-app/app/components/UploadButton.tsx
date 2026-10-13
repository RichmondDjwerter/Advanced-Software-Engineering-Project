"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadButton() {
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) return;

    const formData = new FormData();
    formData.append("image", file);

    await fetch("/api/historicalRecord", {
      method: "POST",
      body: formData,
    });
  };

  return (
    <label
      className={cn(
        buttonVariants({ variant: "default", size: "lg" }),
        "cursor-pointer bg-coral text-white hover:bg-coral/85 focus-within:ring-3 focus-within:ring-coral/40"
      )}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleUpload}
      />
      Upload Document
    </label>
  );
}
