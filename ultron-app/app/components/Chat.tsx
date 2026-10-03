import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function Chat() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end gap-3">
        <Field className="flex-1">
          <FieldLabel htmlFor="chat-message" className="sr-only">
            Message
          </FieldLabel>
          <Textarea
            id="chat-message"
            placeholder="Ask a question about this document."
          />
        </Field>
        <Button variant="outline" size="lg">
          Send
        </Button>
      </CardContent>
    </Card>
  );
}
