"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/components/category-icon";
import {
  DEFAULT_CATEGORIES,
  formatCategoryName,
  type CategoryOption,
} from "@/lib/category-options";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

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

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onCategoryChange?: (id: string, category: string) => void;
  categories?: CategoryOption[];
}

const ledgerIconClass =
  "category-icon border border-[#E1EDFD] bg-white text-[#859BB2] shadow-sm";

const AVAILABLE_CATEGORIES = [
  "food",
  "groceries",
  "friends",
  "family",
  "transport",
  "shopping",
  "entertainment",
  "bills",
  "health",
  "other",
];

// Category icons (emoji-style like in the reference image)
const categoryIcons: Record<string, string> = {
  food: "🍜",
  groceries: "🛒",
  friends: "👥",
  family: "👪",
  transport: "🚗",
  shopping: "🛍️",
  entertainment: "🎮",
  bills: "📄",
  health: "⚕️",
  other: "📦",
};

export function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onCategoryChange,
  categories = DEFAULT_CATEGORIES,
}: ExpenseCardProps) {
  const { t } = useLanguage();
  const [changingCategory, setChangingCategory] = useState(false);
  const categoryKey = expense.category
    ? expense.category.toLowerCase()
    : "other";
  const category = categories.find((item) => item.name === categoryKey);
  const iconName = category?.icon || "Package";
  const recordType = expense.recordType || "expense";
  const amountPrefix =
    recordType === "income" || recordType === "reimbursement" ? "+" : "";
  const amountLabel =
    recordType === "liability"
      ? `Owe $${expense.amount.toFixed(2)}`
      : `${amountPrefix}$${expense.amount.toFixed(2)}`;
  const recordLabels: Record<string, string> = {
    expense: t("expense"),
    income: t("income"),
    liability: t("liability"),
    reimbursement: t("reimburse"),
  };

  const handleCategoryChange = async (newCategory: string) => {
    setChangingCategory(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ category: newCategory }),
      });

      if (response.ok) {
        onCategoryChange?.(expense.id, newCategory);
        toast.success("Category updated!");
      } else {
        toast.error("Failed to update category");
      }
    } catch (error) {
      toast.error("Failed to update category");
    } finally {
      setChangingCategory(false);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onEdit(expense)}
      className="cursor-pointer"
    >
      <Card className="cinnamoroll-card overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-4 mb-4">
            {/* Category Icon / Selector */}
            {expense.source === "gmail" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`${ledgerIconClass} cursor-pointer rounded transition hover:bg-[#F8FBFF]`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CategoryIcon name={iconName} className="h-6 w-6" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {categories.map((cat) => (
                    <DropdownMenuItem
                      key={cat.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryChange(cat.name);
                      }}
                      className="cursor-pointer"
                    >
                      <CategoryIcon
                        name={cat.icon}
                        className="mr-2 h-4 w-4 text-[#859BB2]"
                      />
                      {formatCategoryName(cat.name)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className={ledgerIconClass}>
                <CategoryIcon name={iconName} className="h-6 w-6" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {expense.title}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold text-[#859BB2] dark:text-[#859BB2] ml-2">
                    {amountLabel}
                  </div>
                  {/* Source badge */}
                  {expense.source === "gmail" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#E1EDFD] text-[#859BB2] border border-[#D4E5F7]">
                      Gmail
                    </span>
                  )}
                  {expense.source === "voice" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#E1EDFD] text-[#859BB2] border border-[#D4E5F7]">
                      {t("voice")}
                    </span>
                  )}
                  {expense.source === "manual" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {t("manual")}
                    </span>
                  )}
                </div>
              </div>

              {expense.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
                  {expense.description}
                </p>
              )}

              {(expense.counterparty || expense.isRecurring) && (
                <p className="mb-2 text-xs text-gray-500">
                  {expense.counterparty}
                  {expense.counterparty && expense.isRecurring ? " · " : ""}
                  {expense.isRecurring
                    ? `Recurring ${expense.recurringInterval || "monthly"}`
                    : ""}
                </p>
              )}

              {/* Category Badge */}
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-[#E1EDFD] text-[#859BB2] border border-[#D4E5F7]">
                  {recordLabels[recordType]}
                </span>
                {expense.isRecurring && (
                  <span className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-white text-[#859BB2] border border-[#D4E5F7]">
                    {t("recurring")}
                  </span>
                )}
                {(recordType === "liability" ||
                  recordType === "reimbursement") && (
                  <span className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-white text-[#859BB2] border border-[#D4E5F7]">
                    {expense.status === "settled" ? t("settled") : t("open")}
                  </span>
                )}
                {expense.category &&
                expense.category.trim() !== "" &&
                expense.category.toLowerCase() !== "other" &&
                expense.category.toLowerCase() !== "paynow" ? (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#E1EDFD] text-[#859BB2] border border-[#D4E5F7] dark:bg-[#B2D7FF]/20 dark:text-[#D4E5F7] dark:border-[#B2D7FF]">
                    <CategoryIcon name={iconName} className="mr-1 h-3 w-3" />
                    {formatCategoryName(expense.category)}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#E1EDFD] text-[#859BB2] border border-[#D4E5F7] animate-pulse">
                    {t("categoryNotDefined")}
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {typeof expense.date === "string"
                    ? expense.date
                    : format(new Date(expense.date), "MMM dd, yyyy")}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-[#E1EDFD] dark:hover:bg-[#B2D7FF]/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="sr-only">Open menu</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(expense);
                      }}
                      className="rounded-lg"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(expense.id);
                      }}
                      className="rounded-lg text-[#859BB2] focus:bg-[#E1EDFD] focus:text-[#859BB2]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

