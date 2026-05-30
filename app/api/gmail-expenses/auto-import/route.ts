import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthorizedGmailClient } from "@/lib/gmail-oauth";
import { google } from "googleapis";

/**
 * Auto-import endpoint for PayNow Gmail expenses
 * 
 * This endpoint is designed to be called by external cron services (e.g., cron-job.org, EasyCron)
 * to periodically fetch new PayNow emails for ALL users who have Gmail connected.
 * 
 * Usage:
 * 1. Add a cron job to call: GET /api/gmail-expenses/auto-import?secret=YOUR_SECRET_KEY
 * 2. Replace YOUR_SECRET_KEY with the value of GMAIL_AUTO_IMPORT_SECRET in .env.local
 * 3. Set cron frequency (e.g., every 1-2 hours)
 * 
 * Free cron services: cron-job.org, easycron.com, console.cron-job.org
 */

function extractDetailsFromText(text: string, headerDate?: string) {
  const amountMatch = text.match(/SGD\s?([\d,.]+)/);
  const amount = amountMatch
    ? parseFloat(amountMatch[1].replace(/,/g, ""))
    : null;

  let date = null;
  const dateWithYearMatch = text.match(
    /dated\s+([0-9]{1,2}\s+\w+\s+[0-9]{4})/i,
  );
  if (dateWithYearMatch) {
    date = dateWithYearMatch[1];
  } else {
    const dateMatch = text.match(/dated\s+([0-9]{1,2}\s+\w+)/i);
    if (dateMatch) {
      if (headerDate) {
        const yearMatch = headerDate.match(/[0-9]{4}/);
        if (yearMatch) {
          date = `${dateMatch[1]} ${yearMatch[0]}`;
        } else {
          date = dateMatch[1];
        }
      } else {
        date = dateMatch[1];
      }
    }
  }

  let merchant = null;
  const sameLine = text.match(/To:\s*(.+)/);
  const nextLine = text.match(/To:\s*\n\s*(.+)/);
  const fallbackLine = text.match(/(?:To|Merchant|Recipient)[^\n]*\n(.+)/);

  if (sameLine) {
    merchant = sameLine[1]
      .split("If unauthorised")[0]
      .split("To view transaction details")[0]
      .trim();
  } else if (nextLine) {
    merchant = nextLine[1].trim();
  } else if (fallbackLine) {
    merchant = fallbackLine[1].trim();
  } else {
    merchant = "Unknown";
  }
  return { amount, date, merchant };
}

async function importGmailForUser(userId: string) {
  try {
    const { auth } = await getAuthorizedGmailClient(userId);
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "from:ibanking.alert@dbs.com (PAYNOW OR PayNow OR paynow)",
      maxResults: 500,
    });

    const messages = res.data.messages || [];
    let savedCount = 0;

    for (const msg of messages) {
      const msgData = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });
      const payload = msgData.data.payload;

      let headerDate = "";
      if (payload?.headers) {
        const dateHeader = payload.headers.find((h: any) => h.name === "Date");
        if (dateHeader) {
          headerDate = dateHeader.value || "";
        }
      }

      let bodyData = "";
      if (payload?.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            bodyData = Buffer.from(part.body.data, "base64").toString("utf-8");
            break;
          } else if (part.mimeType === "text/html" && part.body?.data) {
            bodyData = Buffer.from(part.body.data, "base64").toString("utf-8");
            bodyData = bodyData.replace(/<[^>]+>/g, "");
            break;
          }
        }
      } else if (payload?.body?.data) {
        bodyData = Buffer.from(payload.body.data, "base64").toString("utf-8");
      }

      if (bodyData) {
        const details = extractDetailsFromText(bodyData, headerDate);
        if (details.amount && details.date && details.merchant) {
          let parsedDate: Date;
          if (/\d{4}/.test(details.date)) {
            parsedDate = new Date(details.date);
          } else {
            const currentYear = new Date().getFullYear();
            parsedDate = new Date(`${details.date} ${currentYear}`);
          }

          const existingByGmailId = await prisma.expense.findUnique({
            where: {
              userId_gmailId: {
                userId,
                gmailId: msg.id!,
              },
            },
          });

          if (!existingByGmailId) {
            const startOfDay = new Date(parsedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(parsedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const duplicateByTransaction = await prisma.expense.findFirst({
              where: {
                userId,
                amount: details.amount,
                date: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
                OR: [
                  {
                    title: {
                      contains: details.merchant.split(" ")[0],
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: details.merchant,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            });

            if (!duplicateByTransaction) {
              await prisma.expense.create({
                data: {
                  userId,
                  title: details.merchant,
                  amount: details.amount,
                  category: "",
                  date: parsedDate,
                  description: `PayNow transaction: ${details.merchant}`,
                  source: "gmail",
                  recordType: "expense",
                  gmailId: msg.id!,
                },
              });
              savedCount++;
            }
          }
        }
      }
    }

    return {
      success: true,
      userId,
      totalMessages: messages.length,
      savedCount,
    };
  } catch (error: any) {
    // Silent fail for users without Gmail connected
    if (error?.message?.includes("Gmail is not connected")) {
      return {
        success: true,
        userId,
        totalMessages: 0,
        savedCount: 0,
        skipped: true,
      };
    }

    return {
      success: false,
      userId,
      error: error?.message || "Unknown error",
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify secret key to prevent unauthorized access
    const secret = request.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.GMAIL_AUTO_IMPORT_SECRET;

    if (!expectedSecret) {
      console.error(
        "[Gmail Auto-Import] GMAIL_AUTO_IMPORT_SECRET not configured",
      );
      return NextResponse.json(
        { error: "Auto-import not configured on server" },
        { status: 500 },
      );
    }

    if (secret !== expectedSecret) {
      console.warn("[Gmail Auto-Import] Invalid secret provided");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("[Gmail Auto-Import] Starting scheduled import for all users...");

    // Get all users with Gmail connections
    const connections = await prisma.gmailConnection.findMany({
      select: { userId: true },
    });

    if (connections.length === 0) {
      console.log("[Gmail Auto-Import] No users with Gmail connected");
      return NextResponse.json({
        success: true,
        totalUsers: 0,
        results: [],
      });
    }

    // Import for each connected user
    const results = await Promise.all(
      connections.map((conn) => importGmailForUser(conn.userId)),
    );

    const stats = {
      totalUsers: connections.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalSaved: results.reduce((sum, r) => sum + (r.savedCount || 0), 0),
    };

    console.log("[Gmail Auto-Import] Complete:", stats);

    return NextResponse.json({
      success: true,
      stats,
      results,
    });
  } catch (error: any) {
    console.error("[Gmail Auto-Import] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
