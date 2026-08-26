"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[calc(100vw-1.5rem)] max-w-md gap-4 rounded-2xl p-5 sm:w-full sm:p-6",
          "left-1/2 top-1/2 max-h-[min(90dvh,640px)] overflow-y-auto",
          "max-md:top-auto max-md:bottom-4 max-md:translate-y-0 max-md:rounded-2xl",
        )}
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="pr-8 text-lg sm:text-xl">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm leading-relaxed">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={cn(
              "w-full sm:w-auto",
              destructive && "bg-red-600 text-white hover:bg-red-500",
            )}
            disabled={confirming}
            onClick={() => void onConfirm()}
          >
            {confirming ? "Please wait…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
