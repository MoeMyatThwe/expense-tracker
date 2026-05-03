"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon?: "dollar" | "calendar" | "chart";
}

export function StatCard({ title, value, change, trend }: StatCardProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.02 }}
    >
      <Card className="cinnamoroll-card overflow-hidden">
        <CardContent className="flex h-full flex-col justify-between px-3 pb-4 pt-2 sm:px-4 sm:pb-5">
          <div className="text-xl font-bold leading-none text-[#859BB2] sm:text-3xl md:text-4xl">
            {value}
          </div>
          <div>
            <CardTitle className="text-[11px] font-semibold leading-tight text-gray-700 dark:text-gray-300 sm:text-sm md:text-base">
              {title}
            </CardTitle>
            {change && (
              <p className="mt-1 flex items-center gap-0.5 whitespace-nowrap text-[9px] leading-none sm:text-[10px] md:text-xs">
              {trend === "up" && (
                <TrendingUp className="h-2.5 w-2.5 text-[#859BB2] sm:h-3 sm:w-3" />
              )}
              {trend === "down" && (
                <TrendingDown className="h-2.5 w-2.5 text-[#859BB2] sm:h-3 sm:w-3" />
              )}
              <span
                className={
                  trend === "up"
                    ? "font-medium text-[#859BB2]"
                    : "font-medium text-[#859BB2]"
                }
              >
                  {change}
                </span>
                <span className="text-gray-500">{t("fromLastMonth")}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
