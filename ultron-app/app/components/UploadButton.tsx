import { buttonVariants } from "@/components/ui/button";

export function UploadButton() {
  return (
    <label
      className={buttonVariants({
        variant: "outline",
        size: "lg",
        className: "cursor-pointer focus-within:ring-3 focus-within:ring-ring/50",
      })}
    >
      <input type="file" className="sr-only" />
      Upload Document
    </label>
  );
}
