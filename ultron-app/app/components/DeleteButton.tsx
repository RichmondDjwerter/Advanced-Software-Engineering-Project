"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TrashIcon } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export function DeleteButton({
  id,
  redirectUrl,
}: {
  id: string;
  redirectUrl: string;
}) {
  const router = useRouter();
  const handleDelete = async () => {
    const request = fetch(`/api/historicalRecords?id=${id}`, {
      method: "DELETE",
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Failed to delete record");
      }
      return response;
    });

    toast.promise(request, {
      loading: "Deleting record…",
      success: "Record successfully deleted.",
      error: "The record could not be deleted. Please try again.",
    });
    try {
      await request;
      router.push(redirectUrl);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <AlertDialogTrigger
            render={
              <Button variant="destructive" aria-label="Delete Record">
                <TrashIcon />
              </Button>
            }
          />
        }
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <TrashIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete record?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this historical record.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
