import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranscriptionView } from "@/app/components/TranscriptionView";
import { EnglishTranslation } from "@/app/components/EnglishTranslation";

type Props = {
  recordId: string;
};

// Component to display the transcription and translation of a historical record
export function TranslationView({ recordId }: Props) {
  return (
    <Card className="h-full">
      <Tabs
        defaultValue="transcription"
        className="flex-1 gap-(--card-spacing)"
      >
        <CardHeader>
          <TabsList variant="line" className="-my-[5px] -ml-[9px]">
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
            <TabsTrigger value="translation">Translation</TabsTrigger>
          </TabsList>
        </CardHeader>
        <TabsContent value="transcription" className="flex">
          <CardContent className="flex min-h-40 flex-1 items-center justify-center">
            <TranscriptionView recordId={recordId} />
          </CardContent>
        </TabsContent>

        <TabsContent value="translation" className="flex">
          <EnglishTranslation recordId={recordId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
