import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { expenseCreateSchema } from "@/lib/validation";

type FamilyExpenseWithEmail = Prisma.FamilyExpenseGetPayload<{
  include: {
    family: { select: { id: true; name: true } };
  };
}> & {
  createdByEmail: string;
};

// Helper to get current user
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

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's family if they're in one
    const userWithFamily = await prisma.user.findUnique({
      where: { id: user.id },
      select: { familyId: true },
    });

    // Get personal expenses
    const personalExpenses = await prisma.expense.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });

    // Get family expenses if user is in a family
    let familyExpenses: FamilyExpenseWithEmail[] = [];
    if (userWithFamily?.familyId) {
      const rawFamilyExpenses = await prisma.familyExpense.findMany({
        where: { familyId: userWithFamily.familyId },
        orderBy: { date: "desc" },
        include: {
          family: { select: { id: true, name: true } },
        },
      });

      // Get creator emails for family expenses
      const creatorIds = [
        ...new Set(rawFamilyExpenses.map((e) => e.createdByUserId)),
      ];
      const creators = await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, email: true },
      });
      const creatorMap = Object.fromEntries(
        creators.map((c) => [c.id, c.email]),
      );

      // Map creator emails to expenses
      familyExpenses = rawFamilyExpenses.map((e) => ({
        ...e,
        createdByEmail: creatorMap[e.createdByUserId] || "Unknown",
      }));
    }

    // Combine and return
    const allExpenses = [
      ...personalExpenses.map((e) => ({ ...e, type: "personal" })),
      ...familyExpenses.map((e) => ({ ...e, type: "family" })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(allExpenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 20,
      windowMs: 60_000,
      keyPrefix: "expenses:create",
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            ),
          },
        },
      );
    }

    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { isFamilyExpense, ...expenseData } = body;

    const parsed = expenseCreateSchema.safeParse(expenseData);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid expense payload",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const {
      title,
      amount,
      category,
      date,
      description,
      source,
      recordType,
      isRecurring,
      recurringInterval,
      status,
      counterparty,
    } = parsed.data;

    // If family expense, save to FamilyExpense table
    if (isFamilyExpense) {
      const userWithFamily = await prisma.user.findUnique({
        where: { id: user.id },
        select: { familyId: true },
      });

      if (!userWithFamily?.familyId) {
        return NextResponse.json(
          { error: "You are not a member of a family" },
          { status: 400 },
        );
      }

      const familyExpense = await prisma.familyExpense.create({
        data: {
          familyId: userWithFamily.familyId,
          createdByUserId: user.id,
          title,
          amount,
          category,
          date: new Date(date),
          description: description || null,
          recordType: recordType || "expense",
        },
      });

      return NextResponse.json(familyExpense, { status: 201 });
    }

    // Regular personal expense
    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        title,
        amount,
        category,
        date: new Date(date),
        description,
        source: source || "manual",
        recordType: recordType || "expense",
        isRecurring: Boolean(isRecurring),
        recurringInterval: isRecurring ? recurringInterval || "monthly" : null,
        status:
          status ||
          (recordType === "liability" || recordType === "reimbursement"
            ? "open"
            : "completed"),
        counterparty: counterparty || null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}
