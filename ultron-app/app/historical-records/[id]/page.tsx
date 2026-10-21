import HistoricalRecordClient from "@/app/historical-records/[id]/HistoricalRecordClient";
import { Chat } from "@/app/components/Chat";
import { Button } from "@/components/ui/button"; 
import { ArrowLeftIcon } from "lucide-react";
import { TranscriptionView } from "@/app/components/TranscriptionView";

type HistoricalRecordPageProps = {
  params: Promise<{ id: string }>;
};

export default async function HistoricalRecordPage({
  params,
}: HistoricalRecordPageProps) {
  const { id } = await params;

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/historical-records">
          <Button variant="outline" size="icon" aria-label="Go Back">
            <ArrowLeftIcon />
          </Button>
        </Link>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Document {id}
        </h1>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-10 pb-20">
        <div className="grid gap-4 lg:grid-cols-2">
          <OriginalView id={id} />
          <TranslationView />
        </div>
        <TranscriptionView recordId={id} />
        <Chat recordId={id}/>
      </div>
    </>
  );

export default async function HistoricalRecordPage(
  props: PageProps<"/historical-records/[id]">,
) {
  const { id } = await props.params;

  return <HistoricalRecordClient id={id} chat={<Chat recordId={id} />} />;
}
