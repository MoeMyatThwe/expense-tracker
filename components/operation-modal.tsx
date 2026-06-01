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
      <DialogContent className="border-slate-200 bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <DialogTitle
              className={`text-lg font-semibold ${
                isSuccess ? "text-green-700" : "text-red-700"
              }`}
            >
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-2 text-slate-600">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            onClick={handleClose}
            className={
              isSuccess
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
