"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/app/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { ExpenseCharts } from "@/components/expense-charts";
import { StatCard } from "@/components/stat-card";
import { CinnamorollLoader } from "@/components/loading-states";
import { useLanguage } from "@/components/language-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  selectedMonth: string;
  selectedYear: string;
  lastMonth: string;
}

const getMonthOptions = (language: "en" | "my" = "en") =>
  Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label: new Date(2024, index, 1).toLocaleString(
      language === "my" ? "my-MM" : "default",
      {
        month: "long",
      },
    ),
  }));

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => currentYear - 3 + index).sort(
    (a, b) => b - a,
  );
};

function createEmptyStats(year: string, month: string): Stats {
  const selectedDate = new Date(Number(year), Number(month) - 1, 1);
  const lastMonthDate = new Date(Number(year), Number(month) - 2, 1);
  const monthlyData = Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(Number(year), index, 1);
    return {
      name: monthDate.toLocaleString("default", { month: "short" }),
      month: monthDate.toLocaleString("default", { month: "long" }),
      year,
      value: 0,
    };
  });

  return {
    totalThisMonth: 0,
    totalLastMonth: 0,
    change: "0.0",
    trend: "up",
    expenseCount: 0,
    categoryData: [],
    yearlyData: [],
    monthlyData,
    monthlyCategoryData: monthlyData.map((item) => ({
      month: item.month,
      year: item.year,
      categories: [],
    })),
    currentMonth: selectedDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    }),
    selectedMonth: selectedDate.toLocaleString("default", { month: "long" }),
    selectedYear: year,
    lastMonth: lastMonthDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    }),
  };
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [selectedMonth, setSelectedMonth] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, "0"),
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStats();
    }
  }, [authLoading, user, selectedYear, selectedMonth]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      const response = await fetch(
        `/api/stats?year=${selectedYear}&month=${selectedMonth}`,
        {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth");
          return;
        }
        throw new Error("Failed to fetch stats");
      }

      setStats(await response.json());
    } catch (error) {
      setStats(createEmptyStats(selectedYear, selectedMonth));
    } finally {
      setLoading(false);
    }
  };

  const selectedMonthLabel =
    getMonthOptions(language).find((month) => month.value === selectedMonth)
      ?.label ||
    selectedMonth;

  const buildSummary = (analytics: Stats) => {
    const current = analytics.totalThisMonth;
    const previous = analytics.totalLastMonth;

    const dateLabel = `${selectedMonthLabel} ${selectedYear}`;

    if (current === 0 && previous === 0) {
      return {
        tone: "good",
        text: t("noSpendingSummary", { date: dateLabel }),
      };
    }

    if (previous === 0) {
      return {
        tone: "bad",
        text: t("noPreviousSummary", {
          amount: current.toFixed(2),
          date: dateLabel,
        }),
      };
    }

    if (current <= previous) {
      return {
        tone: "good",
        text: t("goodSummary", { date: dateLabel }),
      };
    }

    const ratio = current / previous;
    return {
      tone: "bad",
      text:
        ratio >= 2
          ? t("badSummaryRatio", {
              ratio: ratio.toFixed(1),
              date: dateLabel,
            })
          : t("badSummaryMore", {
              amount: (current - previous).toFixed(2),
              date: dateLabel,
            }),
    };
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CinnamorollLoader label={t("loadingAnalytics")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="cinnamoroll-card mb-6 bg-cover bg-center p-6"
          style={{
            backgroundImage:
              "url('/assets/cinamoroll_theme/background/AnalyticsBannerBackground.png')",
          }}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#E1EDFD] p-3 text-[#859BB2]">
                <BarChart3 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#859BB2]">
                  {t("analytics")}
                </h1>
                <p className="text-sm text-gray-600">
                  {t("analyticsSubtitle")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-3">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32 rounded-xl border-[#D4E5F7] bg-white/80 text-[#334155] shadow-sm">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableYears().map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 rounded-xl border-[#D4E5F7] bg-white/80 text-[#334155] shadow-sm">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions(language).map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <CinnamorollLoader label={t("loadingAnalytics")} />
        ) : stats ? (
          <>
            <motion.div
              className={`analytics-summary mb-6 ${
                buildSummary(stats).tone === "good"
                  ? "analytics-summary-good"
                  : "analytics-summary-bad"
              }`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundImage: `url('${
                  buildSummary(stats).tone === "good"
                    ? "/assets/cinamoroll_theme/status/GoodSummary.png"
                    : "/assets/cinamoroll_theme/status/BadSummary.png"
                }')`,
              }}
            >
              <p
                className={
                  buildSummary(stats).tone === "good"
                    ? "text-[#9A7B50]"
                    : "text-white"
                }
              >
                {buildSummary(stats).text}
              </p>
            </motion.div>

            <motion.div
              className="analytics-stat-grid mb-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <StatCard
                title={t("totalIn", {
                  date: `${selectedMonthLabel} ${selectedYear}`,
                })}
                value={`$${stats.totalThisMonth.toFixed(2)}`}
                change={`${stats.change}%`}
                trend={stats.trend}
                icon="dollar"
              />
              <StatCard
                title={t("expenseRecords")}
                value={stats.expenseCount.toString()}
                icon="calendar"
              />
              <StatCard
                title={t("categories")}
                value={(stats.categoryData?.length || 0).toString()}
                icon="chart"
              />
            </motion.div>

            <ExpenseCharts
              categoryData={stats.categoryData}
              monthlyData={stats.monthlyData}
              selectedMonthLabel={`${selectedMonthLabel} ${selectedYear}`}
              selectedYear={selectedYear}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
