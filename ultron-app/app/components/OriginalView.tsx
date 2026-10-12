import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function OriginalView() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Original</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex h-full min-h-40 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          Image will go here
        </div>
      </CardContent>
    </Card>
  );
}
