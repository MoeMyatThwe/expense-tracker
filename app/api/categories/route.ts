import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import {
  CATEGORY_ICONS,
  DEFAULT_CATEGORIES,
  normalizeCategoryName,
} from "@/lib/category-options";
import { categoryCreateSchema } from "@/lib/validation";

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

async function ensureUserAndDefaultCategories(user: {
  id: string;
  email?: string | null;
}) {
  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email || "" },
    create: { id: user.id, email: user.email || "" },
  });

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      userId: user.id,
      name: category.name,
      icon: category.icon,
    })),
    skipDuplicates: true,
  });
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserAndDefaultCategories(user);

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserAndDefaultCategories(user);

    const parsed = categoryCreateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid category payload",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const name = normalizeCategoryName(parsed.data.name);
    const icon = CATEGORY_ICONS.includes(parsed.data.icon)
      ? parsed.data.icon
      : CATEGORY_ICONS[0];

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name,
        icon,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 },
      );
    }

    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
