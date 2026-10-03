import { RecordCard } from "@/app/components/RecordCard";
import { UploadButton } from "@/app/components/UploadButton";

export default function HistoricalRecords() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="font-heading text-2xl font-medium tracking-tight">Historical Records</h1>

      <div className="my-6 flex justify-end">
        <UploadButton />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <RecordCard
          id="1"
          name="Document 1"
          description="Description 1"
        />
        <RecordCard
          id="2"
          name="Document 2"
          description="Description 2"
        />
        <RecordCard
          id="3"
          name="Document 3"
          description="Description 3"
        />
      </div>
    </main>
  );
}