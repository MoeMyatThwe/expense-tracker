import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST() {
  try {
    // Find all manual expenses that have a matching Gmail expense
    const manualExpenses = await prisma.expense.findMany({
      where: { source: "manual" },
    });

    let deletedCount = 0;

    for (const manualExp of manualExpenses) {
      // Look for matching Gmail expense (same amount, same date, similar title)
      const matchingGmailExpenses = await prisma.expense.findMany({
        where: {
          source: "gmail",
          amount: manualExp.amount,
          date: {
            gte: new Date(
              manualExp.date.getFullYear(),
              manualExp.date.getMonth(),
              manualExp.date.getDate(),
            ),
            lt: new Date(
              manualExp.date.getFullYear(),
              manualExp.date.getMonth(),
              manualExp.date.getDate() + 1,
            ),
          },
        },
      });

      if (matchingGmailExpenses.length > 0) {
        for (const gmailExp of matchingGmailExpenses) {
          // Extract first name/word from both titles for fuzzy matching
          const manualWords = manualExp.title
            .toLowerCase()
            .split(/[\s(-]+/)
            .filter((w) => w);
          const gmailWords = gmailExp.title
            .toLowerCase()
            .split(/[\s(-]+/)
            .filter((w) => w);

          // Check if there's significant word overlap (at least one meaningful word match)
          const hasOverlap = manualWords.some((word) =>
            gmailWords.some(
              (gword) =>
                gword.startsWith(word.substring(0, 4)) ||
                word.startsWith(gword.substring(0, 4)),
            ),
          );

          if (hasOverlap) {
            // Delete the manual expense (keeping the Gmail one as source of truth)
            await prisma.expense.delete({
              where: { id: manualExp.id },
            });
            deletedCount++;
            console.log(
              `Deleted duplicate: Manual "${manualExp.title}" ($${manualExp.amount}) matched Gmail "${gmailExp.title}"`,
            );
            break; // Only delete once per manual expense
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete! Deleted ${deletedCount} duplicate manual expenses.`,
      deletedCount,
    });
  } catch (err: any) {
    console.error("[Cleanup Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
