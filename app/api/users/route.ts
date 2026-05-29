import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { userCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(request, {
      limit: 10,
      windowMs: 60_000,
      keyPrefix: "users:create",
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

    const parsed = userCreateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid user payload",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { id, email } = parsed.data;

    const user = await prisma.user.upsert({
      where: { id },
      update: { email },
      create: { id, email },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    // User might already exist
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 200 },
      );
    }

    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
