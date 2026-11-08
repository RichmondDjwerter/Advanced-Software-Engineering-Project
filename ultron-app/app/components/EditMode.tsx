"use client";

import { ReactNode, useState } from "react";
import { Maximize2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type Props = {
  title: string;
  text: string;
  emptyMessage: string;
  // Saves the edited text. Throw to keep the edit mode open.
  onSave: (text: string) => Promise<void>;
  // Extra buttons next to Edit, hidden while editing.
  actions?: ReactNode;
  disabled?: boolean;
};

// Shows a text in a scroll area with an Edit button. Edit switches to a
// textarea with Save and Cancel. The same view is available in a full screen
// dialog and shares its edit state with the card.
export function EditMode({
  title,
  text,
  emptyMessage,
  onSave,
  actions,
  disabled = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  function startEditing() {
    setDraft(text);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Error",
        description: "The text could not be saved. Please try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function renderBody() {
    if (editing) {
      return (
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={saving}
          aria-label="Edit text"
          className="min-h-0 w-full flex-1 resize-none field-sizing-fixed text-sm leading-7"
        />
      );
    }

    if (!text.trim()) {
      return (
        <p className="m-auto text-sm text-muted-foreground">{emptyMessage}</p>
      );
    }

    return (
      <ScrollArea className="min-h-0 w-full flex-1">
        <p className="whitespace-pre-wrap break-words px-4 text-sm leading-7">
          {text}
        </p>
      </ScrollArea>
    );
  }

  // Save and Cancel while editing. Shared by the card and the dialog footer.
  function renderEditButtons() {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </>
    );
  }

  const editButton = (
    <Button variant="outline" onClick={startEditing} disabled={disabled}>
      Edit
    </Button>
  );

  return (
    <Dialog
      open={fullScreen}
      onOpenChange={(open) => {
        // Do not close the dialog while the text is being saved.
        if (!saving) setFullScreen(open);
      }}
    >
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {renderBody()}
      </CardContent>

      <CardFooter className="gap-2">
        {editing ? (
          renderEditButtons()
        ) : (
          <>
            {editButton}
            <DialogTrigger
              render={
                <Button variant="outline">
                  <Maximize2Icon data-icon="inline-start" />
                  Show in full screen
                </Button>
              }
            />
            {actions}
          </>
        )}
      </CardFooter>

      <DialogContent className="flex h-[90vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {renderBody()}
        <DialogFooter>
          {editing ? renderEditButtons() : editButton}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
