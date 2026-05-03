"use client";

import { useEffect, useRef, useState } from "react";
import { ReceiptText, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import { supabase } from "@/lib/supabase";
import { formatCategoryName } from "@/lib/category-options";
import { useLanguage } from "@/components/language-provider";

interface ReceiptItem {
  title: string;
  amount: number;
  category: string;
  description?: string;
  selected: boolean;
}

interface ReceiptResult {
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  items?: Omit<ReceiptItem, "selected">[];
}

interface ReceiptImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ReceiptImportDialog({
  open,
  onOpenChange,
  onImported,
}: ReceiptImportDialogProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const reset = () => {
    setResult(null);
    setItems([]);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleScan = async (file?: File) => {
    if (!file) return;
    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextPreviewUrl;
    });
    setScanning(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const upload = new FormData();
      upload.append("receipt", file);

      const response = await fetch("/api/receipt-scan", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: upload,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to scan receipt");
      }

      const receiptItems =
        Array.isArray(data.items) && data.items.length > 0
          ? data.items
          : [
              {
                title: data.title,
                amount: data.amount,
                category: data.category,
                description: data.description,
              },
            ];

      setResult(data);
      setItems(
        receiptItems.map((item: Omit<ReceiptItem, "selected">) => ({
          ...item,
          selected: true,
        })),
      );
      toast.success(t("receiptScanned"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to scan receipt",
      );
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const toggleItem = (index: number) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const importSelected = async () => {
    if (!result) return;
    const selectedItems = items.filter((item) => item.selected);

    if (selectedItems.length === 0) {
      toast.error(t("selectAtLeastOneItem"));
      return;
    }

    setImporting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      for (const item of selectedItems) {
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: item.title,
            amount: item.amount,
            category: item.category,
            date: result.date,
            description: item.description || `${result.title} receipt item`,
            source: "manual",
            recordType: "expense",
            isRecurring: false,
            recurringInterval: null,
            status: "completed",
            counterparty: null,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.error || "Failed to import receipt item");
        }
      }

      toast.success(t("receiptImported"));
      reset();
      onImported();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import receipt",
      );
    } finally {
      setImporting(false);
    }
  };

  const selectedTotal = items
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl border-2 border-[#D4E5F7] p-0 sm:max-w-2xl">
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <DialogHeader className="shrink-0 space-y-3 px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-2xl text-[#859BB2]">
              <ReceiptText className="h-7 w-7" />
              {t("scanReceipt")}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {t("scanReceiptDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              className="hidden"
              onChange={(event) => handleScan(event.target.files?.[0])}
            />

            {!result ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={scanning}
                className="flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#D4E5F7] bg-white/70 p-6 text-center text-[#859BB2] transition hover:bg-[#E1EDFD]"
              >
                <Upload className="h-10 w-10" />
                <span className="text-lg font-semibold">
                  {scanning ? t("scanning") : t("uploadReceipt")}
                </span>
                <span className="max-w-sm text-sm text-gray-600">
                  {t("uploadReceiptHint")}
                </span>
              </button>
            ) : (
              <div className="space-y-4">
                {previewUrl && (
                  <div className="overflow-hidden rounded-2xl border border-[#D4E5F7] bg-white/80">
                    <img
                      src={previewUrl}
                      alt={t("uploadedReceiptPreview")}
                      className="max-h-80 w-full object-contain"
                    />
                  </div>
                )}

                <div className="rounded-2xl border border-[#D4E5F7] bg-[#E1EDFD]/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-600">{result.title}</p>
                      <p className="text-sm text-gray-600">{result.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-600">
                        {t("receiptTotal")}
                      </p>
                      <p className="text-2xl font-bold text-[#859BB2]">
                        ${Number(result.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <label
                      key={`${item.title}-${item.amount}-${index}`}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#D4E5F7] bg-white/80 p-3 transition hover:bg-[#E1EDFD]"
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItem(index)}
                        className="h-5 w-5 shrink-0 accent-[#859BB2]"
                      />
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
                        <CategoryIcon
                          name={item.category}
                          className="h-7 w-7 object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-gray-800">
                          {item.title}
                        </span>
                        <span className="block text-sm text-[#859BB2]">
                          {formatCategoryName(item.category)}
                        </span>
                      </span>
                      <span className="shrink-0 text-lg font-bold text-[#859BB2]">
                        ${Number(item.amount).toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-[#D4E5F7] bg-white/90 px-6 py-4 backdrop-blur">
            {result && (
              <div className="mr-auto text-sm text-gray-600">
                {t("selectedTotal")}:{" "}
                <span className="font-bold text-[#859BB2]">
                  ${selectedTotal.toFixed(2)}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cinnamoroll-button border-[#D4E5F7] hover:bg-[#E1EDFD]"
            >
              {t("cancel")}
            </Button>
            {result && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={scanning || importing}
                  className="cinnamoroll-button border-[#D4E5F7] hover:bg-[#E1EDFD]"
                >
                  {t("rescan")}
                </Button>
                <Button
                  type="button"
                  onClick={importSelected}
                  disabled={importing}
                  className="cinnamoroll-button bg-[#B2D7FF] text-white hover:bg-[#9AC4E7]"
                >
                  {importing ? t("importing") : t("importSelected")}
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
