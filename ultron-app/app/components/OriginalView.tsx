import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function OriginalView() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Original</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-72 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          Image will go here
        </div>
      </CardContent>
    </Card>
  );
}
