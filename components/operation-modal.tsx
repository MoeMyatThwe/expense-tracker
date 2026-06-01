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
      <DialogContent className="border-[#D4E5F7] bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle className="h-5 w-5 text-[#10b981]" />
            ) : (
              <AlertCircle className="h-5 w-5 text-[#B2D7FF]" />
            )}
            <DialogTitle
              className={`text-lg font-semibold ${
                isSuccess ? "text-[#10b981]" : "text-[#334155]"
              }`}
            >
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-2 text-[#859BB2]">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            onClick={handleClose}
            className={
              isSuccess
                ? "bg-[#10b981] text-white hover:bg-[#059669]"
                : "bg-[#B2D7FF] text-[#334155] hover:bg-[#9AC4E7]"
            }
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
