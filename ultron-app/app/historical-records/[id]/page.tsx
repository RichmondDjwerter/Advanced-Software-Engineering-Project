import HistoricalRecordClient from "@/app/historical-records/[id]/HistoricalRecordClient";
import { Chat } from "@/app/components/Chat";

export default async function HistoricalRecordPage(
  props: PageProps<"/historical-records/[id]">,
) {
  const { id } = await props.params;

  return <HistoricalRecordClient id={id} chat={<Chat recordId={id} />} />;
}
