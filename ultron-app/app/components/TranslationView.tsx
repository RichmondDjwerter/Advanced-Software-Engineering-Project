import {Card, CardHeader, CardContent} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

export function TranslationView() {
    return (
        <Card className="h-full">
            <Tabs defaultValue="transcription" className="flex-1 gap-(--card-spacing)">
                <CardHeader>
                    <TabsList variant="line" className="-my-[5px] -ml-[9px]">
                        <TabsTrigger value="transcription">Transcription</TabsTrigger>
                        <TabsTrigger value="translation">Translation</TabsTrigger>
                    </TabsList>
                </CardHeader>
                <TabsContent value="transcription" className="flex">
                    <CardContent className="flex min-h-40 flex-1 items-center justify-center">
                        Transcription goes here
                    </CardContent>
                </TabsContent>

                <TabsContent value="translation" className="flex">
                    <CardContent className="flex min-h-40 flex-1 items-center justify-center">
                        Translation goes here
                    </CardContent>
                </TabsContent>
            </Tabs>
        </Card>
    )
}
