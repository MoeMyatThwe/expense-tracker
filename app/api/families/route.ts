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

// GET /api/families - get current user's family
export async function GET(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is a member of a family
    const userWithFamily = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        family: {
          include: {
            owner: { select: { id: true, email: true } },
            members: { select: { id: true, email: true } },
          },
        },
        ownedFamily: {
          include: {
            owner: { select: { id: true, email: true } },
            members: { select: { id: true, email: true } },
          },
        },
      },
    });

    // Return whichever family they're part of
    const family = userWithFamily?.family || userWithFamily?.ownedFamily;

    if (!family) {
      return NextResponse.json({ family: null });
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

// POST /api/families - create a new family (requires premium)
export async function POST(request: Request) {
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

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Family name is required" },
        { status: 400 },
      );
    }

    // Check if user already has a family (as owner or member)
    const existingFamily = await prisma.user.findUnique({
      where: { id: user.id },
      select: { familyId: true, ownedFamily: true },
    });

    if (existingFamily?.familyId || existingFamily?.ownedFamily) {
      return NextResponse.json(
        {
          error:
            "You already have a family. Leave it first to create a new one.",
        },
        { status: 400 },
      );
    }

    // Create family
    const family = await prisma.family.create({
      data: {
        name: name.trim(),
        ownerId: user.id,
        members: {
          connect: { id: user.id },
        },
      },
      include: {
        owner: { select: { id: true, email: true } },
        members: { select: { id: true, email: true } },
      },
    });

    return NextResponse.json(family, { status: 201 });
  } catch (error) {
    console.error("Error creating family:", error);
    return NextResponse.json(
      { error: "Failed to create family" },
      { status: 500 },
    );
  }
}
