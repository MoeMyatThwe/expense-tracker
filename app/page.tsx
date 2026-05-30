"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, RefreshCw, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ExpenseCard } from "@/components/expense-card";
import { ExpenseDialog } from "@/components/expense-dialog";
import { ReceiptImportDialog } from "@/components/receipt-import-dialog";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/app/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CinnamorollLoader } from "@/components/loading-states";
import type { CategoryOption } from "@/lib/category-options";
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

interface ExpenseResponse extends Omit<Expense, "date"> {
  date: string | Date;
}

interface MonthlyCategory {
  month: string;
  year: string;
  categories: { name: string; value: number }[];
}

interface Stats {
  totalThisMonth: number;
  totalLastMonth: number;
  change: string;
  trend: "up" | "down";
  expenseCount: number;
  categoryData: { name: string; value: number }[];
  yearlyData: { name: string; value: number }[];
  monthlyData: { name: string; value: number }[];
  monthlyCategoryData: MonthlyCategory[];
  currentMonth: string;
}

type LedgerFilter =
  | "all"
  | "expense"
  | "income"
  | "liability"
  | "reimbursement"
  | "recurring";

const ledgerFilterTabs = [
  { value: "all", labelKey: "all" },
  { value: "expense", labelKey: "expenses" },
  { value: "income", labelKey: "income" },
  { value: "liability", labelKey: "liabilities" },
  { value: "reimbursement", labelKey: "reimburse" },
  { value: "recurring", labelKey: "recurring" },
] as const;

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    // Default to current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [gmailRefreshing, setGmailRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  // Move fetchStats and fetchExpenses above useEffect
  const fetchStats = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      const response = await fetch("/api/stats", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchExpenses = async () => {
    await fetchAllExpenses();
  };

  const fetchCategories = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return;
    }

    const response = await fetch("/api/categories", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.ok) {
      setCategories(await response.json());
    }
  };

  const refreshGmailData = async () => {
    setGmailRefreshing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/gmail-expenses?refresh=true", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (response.status === 401 && error?.needsConnection) {
          toast.error("Please connect Gmail in Settings first");
          router.push("/profile");
          return;
        }
        throw new Error("Failed to refresh Gmail data");
      }

      toast.success("Gmail data refreshed! Reloading...");
      await fetchAllExpenses();
      await fetchStats();
    } catch (error) {
      toast.error("Failed to refresh Gmail data");
    } finally {
      setGmailRefreshing(false);
    }
  };

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCategories();
      fetchAllExpenses();
      fetchStats();
      
      // Auto-refresh Gmail imports after a short delay (1 sec)
      // This gives the page time to show cached data first
      const timer = setTimeout(() => {
        refreshGmailData().catch(() => {
          // Silent fail if Gmail not connected or error occurs
          // User will still see cached expenses
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, user]);

  const fetchAllExpenses = async () => {
    setLoading(true);
    try {
      // Get the user's session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      // Fetch all expenses from database (includes manual, voice, and gmail sources)
      const response = await fetch("/api/expenses", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth");
          return;
        }
        throw new Error("Failed to fetch expenses");
      }

      const data = await response.json();

      const allExpenses = Array.isArray(data)
        ? data.map((e: ExpenseResponse) => ({
            ...e,
            date: typeof e.date === "string" ? new Date(e.date) : e.date,
            recordType: e.recordType || "expense",
            isRecurring: Boolean(e.isRecurring),
            status: e.status || "completed",
          }))
        : [];

      setExpenses(allExpenses);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      toast.error("Failed to fetch expenses");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (
    expenseData: Omit<Expense, "id" | "createdAt" | "updatedAt">,
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        toast.success("Expense added successfully!");
        fetchExpenses();
        fetchStats();
        setDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add expense");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("An error occurred");
    }
  };

  const handleEditExpense = async (
    expenseData: Omit<Expense, "id" | "createdAt" | "updatedAt">,
  ) => {
    if (!editingExpense) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        toast.success("Expense updated successfully!");
        fetchExpenses();
        fetchStats();
        setEditingExpense(null);
        setDialogOpen(false);
      } else {
        toast.error("Failed to update expense");
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("An error occurred");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        toast.success("Expense deleted successfully!");
        fetchExpenses();
        fetchStats();
      } else {
        toast.error("Failed to delete expense");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    setExpenses(
      expenses.map((exp) =>
        exp.id === id ? { ...exp, category: newCategory } : exp,
      ),
    );
    fetchStats();
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingExpense(null);
    setDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setDialogMode("edit");
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  // Helper functions for year/month selection
  const getAvailableYears = () => {
    const years = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    // Show current year and 2 years back and 1 year forward
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years.sort((a, b) => b - a); // Descending order
  };

  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1).padStart(2, "0"),
      label: new Date(2024, i, 1).toLocaleString(
        language === "my" ? "my-MM" : "default",
        { month: "long" },
      ),
    }));
  };

  const currentYear = parseInt(monthFilter.split("-")[0]);
  const currentMonth = monthFilter.split("-")[1];
  const currentMonthName =
    getMonthOptions().find((month) => month.value === currentMonth)?.label ||
    currentMonth;
  const ledgerFilterLabels: Record<typeof filter, string> = {
    all: t("records"),
    expense: t("expenses"),
    income: t("income"),
    liability: t("liabilities"),
    reimbursement: t("reimbursement"),
    recurring: t("recurring"),
  };
  const ledgerStartLabels: Record<typeof filter, string> = {
    all: t("ledger"),
    expense: t("expenseLedger"),
    income: t("incomeLedger"),
    liability: t("liabilityLedger"),
    reimbursement: t("reimbursementLedger"),
    recurring: t("recurringLedger"),
  };

  // Helper function to filter expenses by month
  const filterExpensesByMonthAndSource = (allExpenses: Expense[]) => {
    return allExpenses.filter((expense) => {
      const recordMatch =
        filter === "all"
          ? true
          : filter === "recurring"
            ? expense.isRecurring
            : expense.recordType === filter;
      // Handle both Date objects and string dates
      const expenseDate =
        typeof expense.date === "string"
          ? new Date(expense.date)
          : expense.date;
      const expenseMonth = `${expenseDate.getFullYear()}-${String(
        expenseDate.getMonth() + 1,
      ).padStart(2, "0")}`;
      const monthMatch = expenseMonth === monthFilter;
      return recordMatch && monthMatch;
    });
  };
  const filteredExpenses = filterExpensesByMonthAndSource(expenses);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CinnamorollLoader label={t("loadingLedger")} />
        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="text-4xl mb-4">✨</div>
          <p className="text-gray-600">Loading...</p>
        </motion.div> */}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header with Cinnamoroll theme */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="cinnamoroll-card mb-6 bg-cover bg-center p-6"
          style={{
            backgroundImage:
              "url('/assets/cinamoroll_theme/background/CategoryBannerBackground.png')",
          }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#B2D7FF] rounded-2xl shadow-lg">
                <Wallet className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#859BB2]">
                  {t("ledger")}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("ledgerSubtitle")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={refreshGmailData}
                disabled={gmailRefreshing}
                variant="outline"
                size="sm"
                className="hover:bg-[#E1EDFD] dark:hover:bg-slate-700"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${gmailRefreshing ? "animate-spin" : ""}`}
                />
                {gmailRefreshing ? t("refreshing") : t("refreshGmail")}
              </Button>
              <Button
                onClick={() => setReceiptDialogOpen(true)}
                variant="outline"
                size="sm"
                className="border-[#D4E5F7] bg-white/75 text-[#859BB2] hover:bg-[#E1EDFD]"
              >
                <ReceiptText className="mr-2 h-4 w-4" />
                {t("scanReceipt")}
              </Button>
              <Button
                onClick={openCreateDialog}
                className="cinnamoroll-button bg-[#B2D7FF] hover:bg-[#9AC4E7] text-white shadow-lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("addRecord")}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Expense List with Cinnamoroll theme */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="ledger-browser mb-5">
            <div className="ledger-browser-tabs" role="tablist">
              {ledgerFilterTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`ledger-browser-tab ${
                    filter === tab.value ? "is-active" : ""
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            <div className="ledger-browser-panel flex flex-col">
              <div className="ledger-browser-controls flex w-full flex-row flex-nowrap items-center gap-3">
                <Select
                  value={String(currentYear)}
                  onValueChange={(year) =>
                    setMonthFilter(`${year}-${currentMonth}`)
                  }
                >
                  <SelectTrigger className="w-32 shrink-0 rounded-xl border-[#D4E5F7] bg-white/75 text-[#334155] shadow-sm sm:w-40">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableYears().map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={currentMonth}
                  onValueChange={(month) =>
                    setMonthFilter(`${currentYear}-${month}`)
                  }
                >
                  <SelectTrigger className="w-36 shrink-0 rounded-xl border-[#D4E5F7] bg-white/75 text-[#334155] shadow-sm sm:w-44">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ledger-browser-content w-full">
                {loading ? (
                  <CinnamorollLoader label={t("loadingRecords")} />
                ) : filteredExpenses.length === 0 ? (
                  <div className="ledger-browser-empty">
                    <EmptyState
                      title={t("noRecordsFor", {
                        type: ledgerFilterLabels[filter],
                        date: `${currentYear} ${currentMonthName}`,
                      })}
                      description={t("startLedger", {
                        type: ledgerStartLabels[filter],
                      })}
                      action={
                        <Button
                          onClick={openCreateDialog}
                          className="cinnamoroll-button bg-[#B2D7FF] hover:bg-[#9AC4E7] text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                        {t("addFirstRecord")}
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <motion.div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredExpenses.map((expense) => (
                        <ExpenseCard
                          key={
                            expense.id ||
                            `${expense.title}-${expense.amount}-${expense.date}-${expense.source}`
                          }
                          expense={expense}
                          onEdit={openEditDialog}
                          onDelete={handleDeleteExpense}
                          onCategoryChange={handleCategoryChange}
                          categories={categories}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        {/* Dialog */}
        <ExpenseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={
            dialogMode === "create" ? handleAddExpense : handleEditExpense
          }
          expense={editingExpense}
          mode={dialogMode}
          categories={categories}
        />
        <ReceiptImportDialog
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          onImported={() => {
            fetchExpenses();
            fetchStats();
          }}
        />
      </div>
    </div>
  );
}
