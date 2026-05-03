"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatCategoryName } from "@/lib/category-options";
import { useLanguage } from "@/components/language-provider";

interface ChartData {
  name: string;
  value: number;
}

interface MonthlyData extends ChartData {
  month?: string;
  year?: string;
}

interface ExpenseChartsProps {
  categoryData: ChartData[];
  monthlyData: MonthlyData[];
  selectedMonthLabel: string;
  selectedYear: string;
}

const COLORS = [
  "#9AC4E7",
  "#D4E5F7",
  "#E1EDFD",
  "#B2D7FF",
  "#859BB2",
  "#C7DCF2",
  "#EDF6FF",
];

const moneyTooltip = (value: number | string) =>
  `$${Number(value || 0).toFixed(2)}`;

export function ExpenseCharts({
  categoryData,
  monthlyData,
  selectedMonthLabel,
  selectedYear,
}: ExpenseChartsProps) {
  const { t } = useLanguage();
  const displayCategoryData = categoryData.filter((item) => item.value > 0);
  const displayMonthlyData = monthlyData.map((item) => ({
    ...item,
    value: Number(item.value || 0),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <Card className="cinnamoroll-card min-h-[28rem]">
          <CardHeader>
            <CardTitle className="text-xl text-[#859BB2]">
              {t("categorySpendingFor", { date: selectedMonthLabel })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={displayCategoryData}
                    cx="50%"
                    cy="48%"
                    dataKey="value"
                    labelLine={false}
                    outerRadius={82}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="value"
                      position="outside"
                      formatter={(value) => {
                        const numericValue = Number(value || 0);
                        const total = displayCategoryData.reduce(
                          (sum, item) => sum + item.value,
                          0,
                        );
                        const percent = total
                          ? Math.round((numericValue / total) * 100)
                          : 0;
                        return `${percent}%`;
                      }}
                      fill="#859BB2"
                      fontSize={12}
                      fontWeight={700}
                    />
                    {displayCategoryData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => moneyTooltip(value as number)}
                    labelFormatter={(label) => formatCategoryName(String(label))}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "12px",
                      border: "2px solid #D4E5F7",
                    }}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span className="font-medium text-[#334155]">
                        {formatCategoryName(value)}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[340px]">
                <EmptyState
                  compact
                  title={t("noCategorySpendingTitle")}
                  description={t("noCategorySpendingDesc")}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
      >
        <Card className="cinnamoroll-card min-h-[28rem]">
          <CardHeader>
            <CardTitle className="text-xl text-[#859BB2]">
              {t("monthlySpendingIn", { year: selectedYear })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={displayMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D4E5F7" />
                <XAxis
                  dataKey="name"
                  stroke="#859BB2"
                  tick={{ fill: "#334155", fontSize: 12 }}
                />
                <YAxis
                  stroke="#859BB2"
                  tick={{ fill: "#334155", fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => moneyTooltip(value as number)}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "12px",
                    border: "2px solid #D4E5F7",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="url(#monthlySpendingGradient)"
                  radius={[12, 12, 0, 0]}
                  animationBegin={0}
                  animationDuration={800}
                />
                <defs>
                  <linearGradient
                    id="monthlySpendingGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#9AC4E7" stopOpacity={1} />
                    <stop offset="100%" stopColor="#D4E5F7" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
