import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { supabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { getAuthorizedGmailClient } from "@/lib/gmail-oauth";

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

function extractDetailsFromText(text: string, headerDate?: string) {
  const amountMatch = text.match(/SGD\s?([\d,.]+)/);
  const amount = amountMatch
    ? parseFloat(amountMatch[1].replace(/,/g, ""))
    : null;

  // Try to extract date with year from the email body
  let date = null;
  const dateWithYearMatch = text.match(
    /dated\s+([0-9]{1,2}\s+\w+\s+[0-9]{4})/i,
  );
  if (dateWithYearMatch) {
    date = dateWithYearMatch[1];
  } else {
    // Fall back to extracting just day and month
    const dateMatch = text.match(/dated\s+([0-9]{1,2}\s+\w+)/i);
    if (dateMatch) {
      // If we have header date, try to extract year from it
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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const refresh = searchParams.get("refresh") === "true";

    // Check if we have cached Gmail data
    if (!refresh) {
      const cachedExpenses = await prisma.expense.findMany({
        where: { userId: user.id, gmailId: { not: null } },
        select: {
          title: true,
          amount: true,
          date: true,
          category: true,
        },
      });

      if (cachedExpenses.length > 0) {
        console.log(
          `[Gmail Cache] Using ${cachedExpenses.length} cached emails`,
        );
        // Transform to match the expected format
        const expenses = cachedExpenses.map((e) => ({
          date: e.date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          amount: e.amount,
          merchant: e.title,
          category: e.category,
        }));
        return NextResponse.json({ expenses });
      }
    }

    // Fetch from Gmail if not cached or refresh requested
    console.log("[Gmail] Fetching from Gmail API...");
    const { auth } = await getAuthorizedGmailClient(user.id);
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "from:ibanking.alert@dbs.com (PAYNOW OR PayNow OR paynow)",
      maxResults: 500,
    });
    const messages = res.data.messages || [];
    const expenses = [];
    let savedCount = 0;

    for (const msg of messages) {
      const msgData = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });
      const payload = msgData.data.payload;

      // Extract date from headers
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
            // Optionally strip HTML tags
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
          expenses.push({
            date: details.date,
            amount: details.amount,
            merchant: details.merchant,
            gmailId: msg.id!,
            category: "", // Empty so user can assign category
          });

          // Parse the date for database storage
          let parsedDate: Date;
          if (/\d{4}/.test(details.date)) {
            // Date has year
            parsedDate = new Date(details.date);
          } else {
            // Fall back to current year
            const currentYear = new Date().getFullYear();
            parsedDate = new Date(`${details.date} ${currentYear}`);
          }

          // Store in database with userId + gmailId (composite unique key)
          // This prevents the SAME user from importing the SAME Gmail message twice
          // Different users can import the same Gmail message independently
          try {
            await prisma.expense.create({
              data: {
                userId: user.id,
                title: details.merchant,
                amount: details.amount,
                category: "", // Empty so user can assign proper category
                date: parsedDate,
                description: `PayNow transaction: ${details.merchant}`,
                source: "gmail",
                recordType: "expense",
                gmailId: msg.id!,
              },
            });
            savedCount++;
            console.log(
              `[Gmail] ✅ Created expense: ${details.merchant} SGD ${details.amount} (${details.date})`,
            );
          } catch (error: any) {
            // Prisma unique constraint error when (userId, gmailId) already exists
            if (error?.code === "P2002") {
              console.log(
                `[Gmail] ⏭️  Skipped: ${details.merchant} - Already imported by this user (same Gmail ID)`,
              );
            } else {
              throw error;
            }
          }
        }
      }
    }

    console.log(
      `[Gmail] Fetched ${expenses.length} emails, saved ${savedCount} new ones to database`,
    );
    return NextResponse.json({ expenses });
  } catch (err: any) {
    // Log error details to the server console
    console.error("[Gmail Expenses API] Error:", err);
    if (err && err.message) {
      if (err.message.includes("Gmail is not connected")) {
        return NextResponse.json(
          { expenses: [], needsConnection: true, connected: false },
          { status: 200 },
        );
      }
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
