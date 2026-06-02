"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDangerous = false,
  isLoading = false,
}: ConfirmationModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-2 border-[#D4E5F7] bg-white shadow-xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isDangerous && (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1EDFD]">
                <AlertTriangle className="h-5 w-5 text-[#859BB2]" />
              </span>
            )}
            <DialogTitle className="text-lg font-semibold text-[#334155]">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-3 text-[#64748b]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="rounded-xl border-[#D4E5F7] bg-[#E1EDFD]/70 text-[#334155] hover:bg-[#D4E5F7]"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="rounded-xl bg-[#859BB2] text-white hover:bg-[#6f879d]"
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
