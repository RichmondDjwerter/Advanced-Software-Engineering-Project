"use client";

import { useState } from "react";
import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChatProviderInfo } from "@/app/types/chat";

/**
 * Shows how to set up a provider. The steps come from backend/chat/providers.toml,
 * so this dialog knows no provider by name. Keys are never entered in the browser.
 */
export function ProviderSetupDialog({
  provider,
  checking,
  status,
  onCheck,
  onCancel,
}: {
  /** the provider to set up, null closes the dialog */
  provider: ChatProviderInfo | null;
  checking: boolean;
  status: string | null;
  onCheck: () => void;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const setup = provider?.setup;

  async function copyLine(line: string) {
    try {
      await navigator.clipboard.writeText(line);
      setCopied("Copied");
    } catch {
      setCopied("Copy failed");
    }
  }

  return (
    <Dialog
      open={provider !== null}
      onOpenChange={(next) => {
        if (!next) {
          setCopied(null);
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{setup?.title}</DialogTitle>
          <DialogDescription>
            {provider?.external
              ? `When you use ${provider.label}, document content leaves this computer.`
              : `${provider?.label} runs on this computer.`}
          </DialogDescription>
        </DialogHeader>

        <ol className="flex list-decimal flex-col gap-2 pl-5">
          {setup?.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        {setup?.link && (
          <a
            href={setup.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonVariants({ variant: "outline" })} self-start`}
          >
            {setup.link.label}
            <ExternalLinkIcon data-icon="inline-end" />
          </a>
        )}

        {setup?.copy_line && (
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md bg-muted px-2 py-1.5 break-all">
              {setup.copy_line}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyLine(setup.copy_line ?? "")}
            >
              <CopyIcon data-icon="inline-start" />
              {copied ?? "Copy"}
            </Button>
          </div>
        )}

        <p role="status" className="text-muted-foreground">
          {checking ? "Checking…" : status}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onCheck}
            disabled={checking}
            className="bg-coral text-white hover:bg-coral/85"
          >
            Check again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
