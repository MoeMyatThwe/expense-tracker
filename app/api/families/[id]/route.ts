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

// GET /api/families/[id] - get family details
export async function GET(
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
      include: {
        owner: { select: { id: true, email: true } },
        members: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!family) {
      return NextResponse.json(
        { error: "Family not found" },
        { status: 404 },
      );
    }

    // Check if user is a member of this family
    const isOwner = family.ownerId === user.id;
    const isMember = family.members.some((m) => m.id === user.id);

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "You are not a member of this family" },
        { status: 403 },
      );
    }

    return NextResponse.json({ family });
  } catch (error) {
    console.error("Error fetching family:", error);
    return NextResponse.json(
      { error: "Failed to fetch family" },
      { status: 500 },
    );
  }
}

// DELETE /api/families/[id] - delete family (owner only)
export async function DELETE(
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

    if (family.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only family owner can delete family" },
        { status: 403 },
      );
    }

    // Delete family (cascade takes care of members and expenses)
    await prisma.family.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting family:", error);
    return NextResponse.json(
      { error: "Failed to delete family" },
      { status: 500 },
    );
  }
}
