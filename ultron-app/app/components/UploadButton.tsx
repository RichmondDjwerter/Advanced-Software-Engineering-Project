"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export function UploadButton({
  onUploadSuccess = () => {},
}: {
  onUploadSuccess?: () => void | Promise<void>;
}) {
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.add({
        title: "Upload failed",
        description: "Please select an image file.",
        type: "error",
      });
      input.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    const upload = fetch("/api/historicalRecords", {
      method: "POST",
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to upload file");
      }
      return response;
    });
    toast.promise(upload, {
      loading: `Uploading ${file.name}…`,
      success: `${file.name} successfully uploaded.`,
      error: (err) =>
        err instanceof Error
          ? err.message
          : "File couldn't be uploaded. Please try again.",
    });
    try {
      await upload;
      await onUploadSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      input.value = "";
    }
  };

  return (
    <label
      className={cn(
        buttonVariants({ variant: "default", size: "lg" }),
        "cursor-pointer bg-coral text-white hover:bg-coral/85 focus-within:ring-3 focus-within:ring-coral/40",
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
