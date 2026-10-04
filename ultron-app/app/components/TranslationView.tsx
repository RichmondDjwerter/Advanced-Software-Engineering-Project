import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function TranslationView() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Translation</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-40 flex-1 items-center justify-center">
        <Button variant="outline" size="lg">
          Translate
        </Button>
      </CardContent>
    </Card>
  );
}
