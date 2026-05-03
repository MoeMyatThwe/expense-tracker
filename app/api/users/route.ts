import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { id, email } = await request.json();

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
