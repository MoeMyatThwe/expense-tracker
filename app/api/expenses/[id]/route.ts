import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { ensureAppUser } from "@/lib/app-user";
import { expenseUpdateSchema } from "@/lib/validation";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureAppUser(user);

    const { id } = await params;
    const parsed = expenseUpdateSchema.safeParse(await request.json());

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

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (amount !== undefined)
      updateData.amount =
        typeof amount === "string" ? parseFloat(amount) : amount;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = new Date(date);
    if (description !== undefined) updateData.description = description;
    if (source !== undefined) updateData.source = source;
    if (recordType !== undefined) updateData.recordType = recordType;
    if (isRecurring !== undefined)
      updateData.isRecurring = Boolean(isRecurring);
    if (recurringInterval !== undefined)
      updateData.recurringInterval = isRecurring ? recurringInterval : null;
    if (status !== undefined) updateData.status = status;
    if (counterparty !== undefined)
      updateData.counterparty = counterparty || null;

    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId: user.id },
    });

    if (existingExpense) {
      const expense = await prisma.expense.update({
        where: { id: existingExpense.id },
        data: updateData,
      });

      return NextResponse.json(expense);
    }

    const existingFamilyExpense = await prisma.familyExpense.findFirst({
      where: {
        id,
        family: {
          members: {
            some: { id: user.id },
          },
        },
      },
    });

    if (!existingFamilyExpense) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const familyUpdateData: Record<string, unknown> = {};
    if (title !== undefined) familyUpdateData.title = title;
    if (amount !== undefined)
      familyUpdateData.amount =
        typeof amount === "string" ? parseFloat(amount) : amount;
    if (category !== undefined) familyUpdateData.category = category;
    if (date !== undefined) familyUpdateData.date = new Date(date);
    if (description !== undefined)
      familyUpdateData.description = description || null;
    if (recordType !== undefined) familyUpdateData.recordType = recordType;

    const familyExpense = await prisma.familyExpense.update({
      where: { id: existingFamilyExpense.id },
      data: familyUpdateData,
    });

    return NextResponse.json(familyExpense);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureAppUser(user);

    const { id } = await params;
    const result = await prisma.expense.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count > 0) {
      return NextResponse.json({ success: true });
    }

    const familyResult = await prisma.familyExpense.deleteMany({
      where: {
        id,
        family: {
          members: {
            some: { id: user.id },
          },
        },
      },
    });

    if (familyResult.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 },
    );
  }
}
