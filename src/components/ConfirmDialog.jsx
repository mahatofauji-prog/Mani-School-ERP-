import React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

export default function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, loading, confirmLabel = "Confirm" }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="confirm-cancel" disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirm-accept"
            disabled={loading}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
