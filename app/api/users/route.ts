import { NextResponse } from "next/server";
import { ensureAppUser } from "@/lib/app-user";
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

    const user = await ensureAppUser({ id, email });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
