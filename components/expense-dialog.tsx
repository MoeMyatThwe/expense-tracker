"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import {
  DEFAULT_CATEGORIES,
  formatCategoryName,
  type CategoryOption,
} from "@/lib/category-options";
import { useLanguage } from "@/components/language-provider";

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: Date;
  description?: string | null;
  source: "manual" | "voice" | "gmail";
  recordType: "expense" | "income" | "liability" | "reimbursement";
  isRecurring: boolean;
  recurringInterval?: string | null;
  status: "completed" | "open" | "settled";
  counterparty?: string | null;
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Omit<Expense, "id" | "createdAt" | "updatedAt" | "type" | "createdByEmail">) => void;
  expense?: Expense | null;
  mode: "create" | "edit";
  categories?: CategoryOption[];
}

const recordTypes = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "liability", label: "Liability" },
  { value: "reimbursement", label: "Reimbursement" },
];

const recurringIntervals = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const categoryKeywords: Record<string, string[]> = {
  food: [
    "lunch",
    "dinner",
    "breakfast",
    "meal",
    "pizza",
    "burger",
    "noodles",
    "rice",
    "eat",
    "food",
    "lunch",
  ],
  groceries: [
    "grocery",
    "groceries",
    "supermarket",
    "market",
    "bought",
    "milk",
    "bread",
    "eggs",
  ],
  transport: ["taxi", "bus", "car", "uber", "grab", "petrol", "fuel", "gas"],
  shopping: [
    "shopping",
    "shop",
    "purchase",
    "store",
    "mall",
    "clothes",
    "shoes",
    "buy",
  ],
  entertainment: [
    "movie",
    "cinema",
    "game",
    "music",
    "concert",
    "show",
    "play",
    "fun",
  ],
  health: ["doctor", "hospital", "medicine", "pharmacy", "health", "medical"],
  bills: ["bill", "electricity", "water", "internet", "rent", "payment"],
  friends: ["friend", "with friend", "hangout", "party", "friend meet"],
  family: ["family", "mom", "dad", "sister", "brother", "parent"],
};

// Function to detect category from transcript
const detectCategory = (transcript: string): string | null => {
  const lowerTranscript = transcript.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerTranscript.includes(keyword))) {
      return category;
    }
  }
  return null;
};

export function ExpenseDialog({
  open,
  onOpenChange,
  onSave,
  mode,
  categories = DEFAULT_CATEGORIES,
}: ExpenseDialogProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    recordType: "expense",
    isRecurring: false,
    recurringInterval: "monthly",
    status: "completed",
    counterparty: "",
  });

  const [listening, setListening] = useState(false);
  const [source, setSource] = useState<"manual" | "voice" | "gmail">("manual");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const needsCategory = formData.recordType === "expense";
  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    Boolean(
      (window as SpeechRecognitionWindow).SpeechRecognition ||
      (window as SpeechRecognitionWindow).webkitSpeechRecognition,
    );

  // Start/stop speech recognition
  const handleSpeech = () => {
    if (!hasSpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (!recognitionRef.current) {
      const browserWindow = window as SpeechRecognitionWindow;
      const SpeechRecognition =
        browserWindow.SpeechRecognition ||
        browserWindow.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Speech recognition is not available in this browser.");
        return;
      }
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Mark this as voice input
        setSource("voice");
        // Simple parsing: try to extract title, amount, and description
        // e.g. "add 50 dollars for shopping" or "lunch 12.50 for pizza"
        const amountMatch = transcript.match(/([0-9]+(\.[0-9]{1,2})?)/);
        let title = transcript;
        let amount = "";
        if (amountMatch) {
          amount = amountMatch[0];
          title = transcript
            .replace(amountMatch[0], "") // Remove amount
            .replace(
              /\b(add|spend|spent|cost|for|with|about|on|at|dollars?|pounds?|pesos?)\b/gi,
              "",
            ) // Remove common words
            .trim();
        }
        // Try to detect category from transcript
        const detectedCategory = detectCategory(transcript);

        setFormData((prev) => ({
          ...prev,
          title: title || prev.title,
          amount: amount || prev.amount,
          category: detectedCategory || prev.category,
          description: prev.description || transcript,
        }));
        setListening(false);
      };
      recognitionRef.current.onerror = () => setListening(false);
      recognitionRef.current.onend = () => setListening(false);
    }
    if (!listening) {
      setListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        setListening(false);
        toast.error(
          "Could not start microphone. Please allow microphone access.",
        );
      }
    } else {
      setListening(false);
      try {
        recognitionRef.current.stop();
      } catch {
        setListening(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsCategory && !formData.category) {
      toast.error("Please select a category");
      return;
    }
    onSave({
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: needsCategory ? formData.category : formData.recordType,
      date: new Date(formData.date),
      description: formData.description || null,
      source,
      recordType: formData.recordType as Expense["recordType"],
      isRecurring: formData.isRecurring,
      recurringInterval: formData.isRecurring
        ? formData.recurringInterval
        : null,
      status:
        formData.recordType === "liability" ||
        formData.recordType === "reimbursement"
          ? (formData.status as Expense["status"])
          : "completed",
      counterparty: formData.counterparty || null,
    });
    // Reset source to manual for next expense
    setSource("manual");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl border-2 border-[#D4E5F7] p-0 sm:max-w-[500px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex max-h-[calc(100dvh-2rem)] flex-col"
        >
          <DialogHeader className="shrink-0 space-y-3 px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-2xl text-[#859BB2]">
              {mode === "create" ? (
                t("addRecord")
              ) : (
                <>
                  <Image
                    src="/assets/cinamoroll_theme/App Logo/edit.png"
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                  {t("editExpense")}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {mode === "create" ? t("addRecordDesc") : t("updateRecordDesc")}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6">
              <div className="mb-2 flex justify-end">
                {hasSpeechRecognition && (
                  <button
                    type="button"
                    aria-label={
                      listening ? "Stop listening" : "Start speech input"
                    }
                    onClick={handleSpeech}
                    className={`rounded-full p-2 border border-[#D4E5F7] shadow-sm mr-2 flex items-center justify-center ${listening ? "bg-[#E1EDFD]" : "bg-white"}`}
                    title="Speak to fill fields"
                  >
                    {/* Microphone icon */}
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <rect
                        x="9"
                        y="4"
                        width="6"
                        height="12"
                        rx="3"
                        fill="#B2D7FF"
                      />
                      <path
                        d="M5 11v1a7 7 0 0 0 14 0v-1"
                        stroke="#D4E5F7"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 19v2"
                        stroke="#D4E5F7"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Animated wavelength when listening */}
                    {listening && (
                      <span className="ml-2 flex h-5 items-end gap-[2px]">
                        <span className="w-1 h-2 bg-[#B2D7FF] animate-wave1 rounded"></span>
                        <span className="w-1 h-4 bg-[#D4E5F7] animate-wave2 rounded"></span>
                        <span className="w-1 h-3 bg-[#B2D7FF] animate-wave3 rounded"></span>
                        <span className="w-1 h-5 bg-[#9AC4E7] animate-wave1 rounded"></span>
                        <span className="w-1 h-3 bg-[#B2D7FF] animate-wave3 rounded"></span>
                        <span className="w-1 h-4 bg-[#D4E5F7] animate-wave2 rounded"></span>
                        <span className="w-1 h-2 bg-[#B2D7FF] animate-wave1 rounded"></span>
                      </span>
                    )}
                    <span className="sr-only">
                      {listening ? "Listening..." : "Start speech input"}
                    </span>
                  </button>
                )}
              </div>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="text-gray-700 font-medium">
                    {t("recordType")}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {recordTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            recordType: type.value,
                            category:
                              type.value === "expense" ? formData.category : "",
                            status:
                              type.value === "liability" ||
                              type.value === "reimbursement"
                                ? "open"
                                : "completed",
                          })
                        }
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          formData.recordType === type.value
                            ? "border-[#9AC4E7] bg-[#E1EDFD] text-[#859BB2]"
                            : "border-[#D4E5F7] bg-white text-gray-600 hover:bg-[#E1EDFD]"
                        }`}
                      >
                        {type.value === "expense"
                          ? t("expense")
                          : type.value === "income"
                            ? t("income")
                            : type.value === "liability"
                              ? t("liability")
                              : t("reimbursement")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-gray-700 font-medium">
                    {t("title")}
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Grocery shopping"
                    className="rounded-xl border-[#D4E5F7] focus:border-[#B2D7FF] focus:ring-[#B2D7FF]"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount" className="text-gray-700 font-medium">
                    {t("amount")}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="rounded-xl border-[#D4E5F7] focus:border-[#B2D7FF] focus:ring-[#B2D7FF]"
                    required
                  />
                </div>
                {needsCategory && (
                  <div className="grid gap-2">
                    <Label
                      htmlFor="category"
                      className="text-gray-700 font-medium"
                    >
                      {t("category")}{" "}
                      {formData.category && (
                        <span className="text-sm text-[#859BB2]">
                          {t("selected")}:{" "}
                          {formatCategoryName(formData.category)}
                        </span>
                      )}
                    </Label>
                    <Select
                      value={formData.category || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger className="rounded-xl border-[#D4E5F7]">
                        <SelectValue placeholder={t("selectCategory")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map((category) => (
                          <SelectItem
                            key={category.name}
                            value={category.name}
                            className="rounded-lg"
                          >
                            <span className="inline-flex items-center gap-2">
                              <CategoryIcon
                                name={category.icon}
                                className="h-4 w-4 text-[#859BB2]"
                              />
                              {formatCategoryName(category.name)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(formData.recordType === "liability" ||
                  formData.recordType === "reimbursement") && (
                  <div className="grid gap-2">
                    <Label
                      htmlFor="counterparty"
                      className="text-gray-700 font-medium"
                    >
                      {t("personOrg")}
                    </Label>
                    <Input
                      id="counterparty"
                      value={formData.counterparty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          counterparty: e.target.value,
                        })
                      }
                      placeholder={t("whoInvolved")}
                      className="rounded-xl border-[#D4E5F7] focus:border-[#B2D7FF] focus:ring-[#B2D7FF]"
                    />
                  </div>
                )}

                {(formData.recordType === "liability" ||
                  formData.recordType === "reimbursement") && (
                  <div className="grid gap-2">
                    <Label className="text-gray-700 font-medium">
                      {t("status")}
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger className="rounded-xl border-[#D4E5F7]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="open">{t("open")}</SelectItem>
                        <SelectItem value="settled">{t("settled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-xl border border-[#D4E5F7] bg-white/70 p-3">
                  <label className="flex items-center justify-between gap-3 text-sm font-medium text-gray-700">
                    <span>{t("recurring")}</span>
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isRecurring: e.target.checked,
                        })
                      }
                      className="h-5 w-5 accent-[#859BB2]"
                    />
                  </label>
                  {formData.isRecurring && (
                    <div className="mt-3">
                      <Select
                        value={formData.recurringInterval}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            recurringInterval: value,
                          })
                        }
                      >
                        <SelectTrigger className="rounded-xl border-[#D4E5F7]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {recurringIntervals.map((interval) => (
                            <SelectItem
                              key={interval.value}
                              value={interval.value}
                            >
                              {interval.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date" className="text-gray-700 font-medium">
                    {t("date")}
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="rounded-xl border-[#D4E5F7] focus:border-[#B2D7FF] focus:ring-[#B2D7FF]"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="description"
                    className="text-gray-700 font-medium"
                  >
                    {t("descriptionOptional")}
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={t("notesRecord")}
                    className="rounded-xl border-[#D4E5F7] focus:border-[#B2D7FF] focus:ring-[#B2D7FF]"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-[#D4E5F7] bg-white/90 px-6 py-4 backdrop-blur">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cinnamoroll-button border-[#D4E5F7] hover:bg-[#E1EDFD]"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                className="cinnamoroll-button bg-[#B2D7FF] hover:bg-[#9AC4E7] text-white"
              >
                {mode === "create" ? t("addRecord") : t("saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
