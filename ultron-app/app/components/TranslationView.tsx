import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranscriptionView } from "@/app/components/TranscriptionView";
import { EnglishTranslation } from "@/app/components/EnglishTranslation";

type Props = {
  recordId: string;
  activeTab: "transcription" | "translation";
  onTabChange: (tab: "transcription" | "translation") => void;
  activeLine: number | null;
  onLineHover: (line: number | null) => void;
  selectedLine: number | null;
  selectionVersion: number;
  onLineClick: (line: number) => void;
};

// Component to display the transcription and translation of a historical record
export function TranslationView({
  recordId,
  activeTab,
  onTabChange,
  activeLine,
  onLineHover,
  selectedLine,
  selectionVersion,
  onLineClick,
}: Props) {
  return (
    <Card className="h-full">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "transcription" || value === "translation") {
            onTabChange(value);
          }
        }}
        className="min-h-0 flex-1 gap-(--card-spacing)"
      >
        <CardHeader>
          <TabsList variant="line" className="-my-[5px] -ml-[9px]">
            <TabsTrigger value="transcription" className="after:bg-coral">
              Transcription
            </TabsTrigger>
            <TabsTrigger value="translation" className="after:bg-coral">
              Translation
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <TabsContent value="transcription" className="flex min-h-0 flex-col">
          <TranscriptionView
            recordId={recordId}
            isActive={activeTab === "transcription"}
            activeLine={activeLine}
            onLineHover={onLineHover}
            selectedLine={selectedLine}
            selectionVersion={selectionVersion}
            onLineClick={onLineClick}
          />
        </TabsContent>

        <TabsContent value="translation" className="flex min-h-0 flex-col">
          <EnglishTranslation recordId={recordId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
