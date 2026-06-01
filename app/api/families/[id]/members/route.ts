import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

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

// GET /api/families/[id]/members - list family members
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
        members: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Check membership
    const isMember = family.members.some((m) => m.id === user.id);
    if (!isMember && family.ownerId !== user.id) {
      return NextResponse.json(
        { error: "You are not a member of this family" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      members: family.members,
      ownerId: family.ownerId,
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 },
    );
  }
}

// POST /api/families/[id]/members - add member by email
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check premium membership
    const membership = await prisma.membership.findUnique({
      where: { userId: user.id },
    });

    if (!membership || membership.status !== "active") {
      return NextResponse.json(
        { error: "Family feature requires premium membership" },
        { status: 403 },
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const family = await prisma.family.findUnique({
      where: { id: params.id },
      include: { members: true },
    });

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Only owner can add members
    if (family.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only family owner can add members" },
        { status: 403 },
      );
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User with this email not found" },
        { status: 404 },
      );
    }

    // Check if already a member
    const alreadyMember = family.members.some((m) => m.id === targetUser.id);
    if (alreadyMember) {
      return NextResponse.json(
        { error: "User is already a member of this family" },
        { status: 400 },
      );
    }

    // Add member
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        familyId: family.id,
      },
    });

    return NextResponse.json({
      success: true,
      member: { id: targetUser.id, email: targetUser.email },
    });
  } catch (error) {
    console.error("Error adding member:", error);

    let errorMessage = "Failed to add member";

    if (error instanceof Error) {
      if (error.message.includes("needs at least one")) {
        errorMessage = "Invalid family. Please refresh and try again.";
      } else if (error.message.includes("unique constraint")) {
        errorMessage = "User is already a member of this family.";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/families/[id]/members/[userId] - remove member
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; userId: string } },
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
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // Only owner can remove members
    if (family.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only family owner can remove members" },
        { status: 403 },
      );
    }

    // Can't remove owner
    if (params.userId === family.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove family owner" },
        { status: 400 },
      );
    }

    // Remove member
    await prisma.user.update({
      where: { id: params.userId },
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
