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

export async function GET(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.gmailConnection.findUnique({
    where: { userId: user.id },
    select: {
      googleEmail: true,
      connectedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    connected: Boolean(connection),
    connection,
  });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.gmailConnection.deleteMany({
    where: { userId: user.id },
  });

  return NextResponse.json({ connected: false });
}
