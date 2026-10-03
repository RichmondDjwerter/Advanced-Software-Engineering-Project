import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadButton() {
  return (
    <label
      className={cn(
        buttonVariants({ variant: "default", size: "lg" }),
        "cursor-pointer bg-coral text-white hover:bg-coral/85 focus-within:ring-3 focus-within:ring-coral/40"
      )}
    >
      <input type="file" className="sr-only" />
      Upload Document
    </label>
  );
}
