import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  startOfYear,
  endOfYear,
} from "date-fns";

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user;
}

async function ensureAppUser(user: { id: string; email?: string | null }) {
  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email || "" },
    create: { id: user.id, email: user.email || "" },
  });
}

function createEmptyStats(selectedDate: Date) {
  const requestedYear = selectedDate.getFullYear();
  const lastMonthDate = subMonths(selectedDate, 1);
  const monthlyData = Array.from({ length: 12 }, (_, index) => {
    const monthStart = startOfMonth(new Date(requestedYear, index, 1));
    return {
      name: format(monthStart, "MMM"),
      month: format(monthStart, "MMMM"),
      year: format(monthStart, "yyyy"),
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
    currentMonth: format(selectedDate, "MMMM yyyy"),
    selectedMonth: format(selectedDate, "MMMM"),
    selectedYear: format(selectedDate, "yyyy"),
    lastMonth: format(lastMonthDate, "MMMM yyyy"),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const requestedYear = Number(searchParams.get("year")) || now.getFullYear();
  const requestedMonth = Number(searchParams.get("month")) || now.getMonth() + 1;
  const selectedDate = new Date(requestedYear, requestedMonth - 1, 1);

  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureAppUser(user);

    const currentMonthStart = startOfMonth(selectedDate);
    const currentMonthEnd = endOfMonth(selectedDate);
    const lastMonthDate = subMonths(selectedDate, 1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);
    const currentYearStart = startOfYear(selectedDate);
    const currentYearEnd = endOfYear(selectedDate);

    // Get current month expenses
    const currentMonthExpenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        recordType: "expense",
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    // Get last month expenses
    const lastMonthExpenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        recordType: "expense",
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    // Get current year expenses
    const currentYearExpenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        recordType: "expense",
        date: {
          gte: currentYearStart,
          lte: currentYearEnd,
        },
      },
    });

    // Calculate totals
    const currentTotal = currentMonthExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0,
    );
    const lastTotal = lastMonthExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0,
    );

    // Calculate change percentage
    const change =
      lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    // Group by category (monthly)
    const categoryData = currentMonthExpenses.reduce(
      (acc, exp) => {
        // Normalize category: treat empty, whitespace, and "paynow" as "Undefined Category"
        const normalizedCategory =
          !exp.category ||
          !exp.category.trim() ||
          exp.category.toLowerCase() === "paynow"
            ? "Undefined Category"
            : exp.category;

        if (!acc[normalizedCategory]) {
          acc[normalizedCategory] = 0;
        }
        acc[normalizedCategory] += exp.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by category (yearly)
    const yearlyData = currentYearExpenses.reduce(
      (acc, exp) => {
        // Normalize category: treat empty, whitespace, and "paynow" as "Undefined Category"
        const normalizedCategory =
          !exp.category ||
          !exp.category.trim() ||
          exp.category.toLowerCase() === "paynow"
            ? "Undefined Category"
            : exp.category;

        if (!acc[normalizedCategory]) {
          acc[normalizedCategory] = 0;
        }
        acc[normalizedCategory] += exp.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get selected year's monthly data and monthly categories
    const monthlyData = [];
    const monthlyCategoryData = [];

    for (let i = 0; i < 12; i++) {
      const monthStart = startOfMonth(new Date(requestedYear, i, 1));
      const monthEnd = endOfMonth(monthStart);

      const monthExpenses = await prisma.expense.findMany({
        where: {
          userId: user.id,
          recordType: "expense",
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      monthlyData.push({
        name: format(monthStart, "MMM"),
        month: format(monthStart, "MMMM"),
        year: format(monthStart, "yyyy"),
        value: total,
      });

      // Group this month's expenses by category
      const monthCategoryData = monthExpenses.reduce(
        (acc, exp) => {
          // Normalize category: treat empty, whitespace, and "paynow" as "Undefined Category"
          const normalizedCategory =
            !exp.category ||
            !exp.category.trim() ||
            exp.category.toLowerCase() === "paynow"
              ? "Undefined Category"
              : exp.category;

          if (!acc[normalizedCategory]) {
            acc[normalizedCategory] = 0;
          }
          acc[normalizedCategory] += exp.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      monthlyCategoryData.push({
        month: format(monthStart, "MMMM"),
        year: format(monthStart, "yyyy"),
        categories: Object.entries(monthCategoryData).map(([name, value]) => ({
          name,
          value,
        })),
      });
    }

    return NextResponse.json({
      totalThisMonth: currentTotal,
      totalLastMonth: lastTotal,
      change: change.toFixed(1),
      trend: change >= 0 ? "up" : "down",
      expenseCount: currentMonthExpenses.length,
      categoryData: Object.entries(categoryData).map(([name, value]) => ({
        name,
        value,
      })),
      yearlyData: Object.entries(yearlyData).map(([name, value]) => ({
        name,
        value,
      })),
      monthlyData,
      monthlyCategoryData,
      currentMonth: format(selectedDate, "MMMM yyyy"),
      selectedMonth: format(selectedDate, "MMMM"),
      selectedYear: format(selectedDate, "yyyy"),
      lastMonth: format(lastMonthDate, "MMMM yyyy"),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(createEmptyStats(selectedDate));
  }
}
