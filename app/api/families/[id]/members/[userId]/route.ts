import { NextRequest, NextResponse } from "next/server";
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

// DELETE /api/families/[id]/members/[userId] - remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, userId } = await params;
    const family = await prisma.family.findUnique({
      where: { id },
    });

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    if (family.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only family owner can remove members" },
        { status: 403 },
      );
    }

    if (userId === family.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove family owner" },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        familyId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 },
    );
  }
}
