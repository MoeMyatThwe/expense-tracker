import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import { writeFile, unlink } from "fs/promises";
import { supabase } from "@/lib/supabase";

const execFileAsync = promisify(execFile);
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function getPythonCommand() {
  return process.env.PYTHON_PATH || "python";
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
    const { stdout } = await execFileAsync(getPythonCommand(), [scriptPath, tempPath], {
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 4,
    });

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
