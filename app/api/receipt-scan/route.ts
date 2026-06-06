import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import { writeFile, unlink } from "fs/promises";
import { createWorker } from "tesseract.js";
import { supabase } from "@/lib/supabase";

const execFileAsync = promisify(execFile);
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PYTHON_NOT_FOUND_MESSAGE =
  "Python is not available on the server. Configure PYTHON_PATH to a Python executable and install: python -m pip install -r requirements.txt";
const AMOUNT_PATTERN =
  /(?:S\$|\$)?\s*([+-]?[0-9]+(?:[,.][0-9]{3})*(?:\.[0-9]{2})|[+-]?[0-9]+\.[0-9]{2})/g;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  groceries: [
    "fairprice",
    "ntuc",
    "cold storage",
    "sheng siong",
    "market",
    "supermarket",
    "grocery",
    "groceries",
    "giant",
    "prime",
  ],
  food: [
    "restaurant",
    "cafe",
    "coffee",
    "kopi",
    "food",
    "kitchen",
    "mcdonald",
    "kfc",
    "toast",
    "bakery",
    "tea",
    "sushi",
    "noodle",
  ],
  transport: ["taxi", "grab", "gojek", "comfort", "smrt", "bus", "mrt"],
  shopping: ["uniqlo", "zara", "mall", "shopee", "lazada", "amazon", "store"],
  health: ["guardian", "watsons", "pharmacy", "clinic", "hospital", "medical"],
  entertainment: ["cinema", "movie", "game", "ktv", "ticket"],
  bills: ["bill", "electric", "water", "telco", "singtel", "starhub", "m1"],
};

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

function getPythonCommands() {
  return [
    process.env.PYTHON_PATH ? { command: process.env.PYTHON_PATH, args: [] } : null,
    { command: "python", args: [] },
    { command: "python3", args: [] },
    { command: "py", args: ["-3"] },
  ].filter(Boolean) as { command: string; args: string[] }[];
}

function isMissingExecutableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function cleanAmount(value: string) {
  const cleaned = value
    .replace(/,/g, "")
    .replace("S$", "")
    .replace("$", "")
    .trim();
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function extractTotal(lines: string[]) {
  const totalKeywords = ["grand total", "total amount", "amount due", "net total", "total"];
  const ignoreKeywords = [
    "subtotal",
    "sub total",
    "savings",
    "change",
    "cash",
    "tax",
    "gst",
    "visa",
    "mastercard",
    "items",
  ];
  const candidates: { score: number; amount: number }[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (ignoreKeywords.some((keyword) => lower.includes(keyword))) continue;

    const matches = [...line.matchAll(AMOUNT_PATTERN)];
    if (matches.length === 0) continue;

    const amount = cleanAmount(matches[matches.length - 1][1]);
    if (!amount || amount <= 0) continue;

    candidates.push({
      score: totalKeywords.some((keyword) => lower.includes(keyword)) ? 2 : 1,
      amount,
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  return candidates[0].amount;
}

function extractDate(lines: string[]) {
  const joined = lines.join("\n");
  const patterns = [
    /\b([0-3]?\d[/-][01]?\d[/-](?:20)?\d{2})\b/,
    /\b((?:20)?\d{2}[/-][01]?\d[/-][0-3]?\d)\b/,
    /\b([0-3]?\d\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(?:20)?\d{2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = joined.match(pattern);
    if (match?.[1]) {
      const date = new Date(match[1]);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }
  }

  return new Date().toISOString().split("T")[0];
}

function extractMerchant(lines: string[]) {
  const noisy = ["receipt", "tax invoice", "invoice", "gst", "duplicate", "customer copy"];
  const merchant = lines
    .slice(0, 8)
    .find((line) => {
      const lower = line.toLowerCase();
      return (
        line.length >= 3 &&
        !noisy.some((word) => lower.includes(word)) &&
        !/^\d+([./-]\d+)*$/.test(line)
      );
    });

  return merchant?.slice(0, 80) || "Receipt";
}

function detectCategory(lines: string[], merchant: string) {
  const text = `${merchant} ${lines.join(" ")}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }

  return "shopping";
}

function extractItems(lines: string[], category: string) {
  const items = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      ["total", "visa", "terminal", "transaction", "gst", "tax", "cash"].some(
        (keyword) => lower.includes(keyword),
      )
    ) {
      continue;
    }

    const matches = [...line.matchAll(AMOUNT_PATTERN)];
    if (matches.length === 0) continue;

    const amount = cleanAmount(matches[matches.length - 1][1]);
    const title = normalizeLine(line.replace(AMOUNT_PATTERN, "")).slice(0, 80);
    if (!amount || amount <= 0 || title.length < 2 || !/[a-z]/i.test(title)) {
      continue;
    }

    items.push({
      title,
      amount,
      category,
      description: "Scanned receipt item",
    });
  }

  return items.slice(0, 20);
}

async function runTesseractOcr(tempPath: string) {
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(tempPath);
    const lines = text
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter(Boolean);
    const merchant = extractMerchant(lines);
    const amount = extractTotal(lines);
    const category = detectCategory(lines, merchant);

    if (amount === null) {
      return {
        success: false,
        error: "Could not detect a receipt total. Try a clearer photo.",
        rawText: lines.join("\n"),
      };
    }

    return {
      success: true,
      title: merchant,
      amount,
      category,
      date: extractDate(lines),
      description: "Scanned receipt",
      items: extractItems(lines, category),
      rawText: lines.join("\n"),
    };
  } finally {
    await worker.terminate();
  }
}

async function runReceiptOcr(scriptPath: string, tempPath: string) {
  const errors: string[] = [];

  for (const python of getPythonCommands()) {
    try {
      return await execFileAsync(
        python.command,
        [...python.args, scriptPath, tempPath],
        {
          timeout: 60000,
          maxBuffer: 1024 * 1024 * 4,
        },
      );
    } catch (error) {
      if (!isMissingExecutableError(error)) {
        throw error;
      }

      errors.push(python.command);
    }
  }

  throw new Error(`${PYTHON_NOT_FOUND_MESSAGE} Tried: ${errors.join(", ")}`);
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("receipt");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Receipt image is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Please upload a JPG, PNG, or WEBP receipt image" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Receipt image is too large. Please upload an image under 8MB" },
      { status: 400 },
    );
  }

  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const tempPath = path.join(os.tmpdir(), `receipt-${randomUUID()}.${extension}`);

  try {
    const bytes = await file.arrayBuffer();
    await writeFile(tempPath, Buffer.from(bytes));

    const scriptPath = path.join(process.cwd(), "scripts", "receipt_ocr.py");
    let stdout = "";
    try {
      const result = await runReceiptOcr(scriptPath, tempPath);
      stdout = result.stdout;
    } catch (error) {
      if (!isMissingExecutableError(error)) {
        const message = error instanceof Error ? error.message : "";
        if (!message.includes(PYTHON_NOT_FOUND_MESSAGE)) {
          throw error;
        }
      }

      const result = await runTesseractOcr(tempPath);
      return NextResponse.json(result, { status: result.success ? 200 : 422 });
    }

    const jsonStart = stdout.indexOf("{");
    const jsonText = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;
    const result = JSON.parse(jsonText);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[Receipt Scan] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to scan receipt image",
      },
      { status: 500 },
    );
  } finally {
    await unlink(tempPath).catch(() => undefined);
  }
}
