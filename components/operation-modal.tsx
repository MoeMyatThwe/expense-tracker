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
import { CheckCircle, AlertCircle } from "lucide-react";

interface OperationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "success" | "error";
  title: string;
  message: string;
  onClose?: () => void;
}

export function OperationModal({
  open,
  onOpenChange,
  type,
  title,
  message,
  onClose,
}: OperationModalProps) {
  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  const isSuccess = type === "success";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-2 border-[#D4E5F7] bg-white shadow-xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1EDFD]">
                <CheckCircle className="h-5 w-5 text-[#859BB2]" />
              </span>
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E1EDFD]">
                <AlertCircle className="h-5 w-5 text-[#859BB2]" />
              </span>
            )}
            <DialogTitle
              className="text-lg font-semibold text-[#334155]"
            >
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-3 text-[#859BB2]">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            onClick={handleClose}
            className="bg-[#B2D7FF] font-semibold text-[#334155] hover:bg-[#9AC4E7]"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
