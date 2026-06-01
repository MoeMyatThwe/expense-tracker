import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

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

// POST /api/families/[id]/leave - user leaves family
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const family = await prisma.family.findUnique({
      where: { id: params.id },
    });

    if (!family) {
      return NextResponse.json(
        { error: "Family not found" },
        { status: 404 },
      );
    }

    // Check if user is a member
    const userInFamily = await prisma.user.findUnique({
      where: { id: user.id },
      select: { familyId: true },
    });

    if (userInFamily?.familyId !== family.id) {
      return NextResponse.json(
        { error: "You are not a member of this family" },
        { status: 403 },
      );
    }

    // Can't leave if you're the owner (unless it's the last operation)
    if (family.ownerId === user.id) {
      return NextResponse.json(
        { error: "Owner must delete the family, not leave it. Remove all other members first." },
        { status: 400 },
      );
    }

    // Leave family
    await prisma.user.update({
      where: { id: user.id },
      data: {
        familyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving family:", error);
    return NextResponse.json(
      { error: "Failed to leave family" },
      { status: 500 },
    );
  }
}
