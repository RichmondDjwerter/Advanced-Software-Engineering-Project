import Link from "next/link";
import { OriginalView } from "@/app/components/OriginalView";
import { TranslationView } from "@/app/components/TranslationView";
import { Chat } from "@/app/components/Chat";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { ULTRON_URL } from "@/app/lib/api";

export default async function HistoricalRecordPage(
  props: PageProps<"/historical-records/[id]">,
) {
  const { id } = await props.params;
  const { name } = await fetch(
    `${ULTRON_URL}/api/historicalRecords?id=${id}`,
  ).then((res) => res.json());

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/historical-records">
          <Button variant="outline" size="icon" aria-label="Go Back">
            <ArrowLeftIcon />
          </Button>
        </Link>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Document {name}
        </h1>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-10 pb-20">
        <div className="grid gap-4 lg:grid-cols-2">
          <OriginalView id={id} />
          <TranslationView />
        </div>

        <Chat recordId={id} />
      </div>
    </>
  );
}
