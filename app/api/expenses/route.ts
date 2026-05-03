import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

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

    const expenses = await prisma.expense.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(expenses);
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
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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
    } = body;

    const expense = await prisma.expense.create({
      data: {
        userId: user.id,
        title,
        amount: parseFloat(amount),
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
