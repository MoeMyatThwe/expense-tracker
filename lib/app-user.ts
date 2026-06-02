import { prisma } from "@/lib/prisma";

type SupabaseLikeUser = {
  id: string;
  email?: string | null;
};

function isPrismaUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export function getAppUserEmail(user: SupabaseLikeUser) {
  const email = user.email?.trim().toLowerCase();

  if (email && email.includes("@")) {
    return email;
  }

  return `${user.id}@user.local`;
}

export async function ensureAppUser(user: SupabaseLikeUser) {
  const email = getAppUserEmail(user);

  try {
    return await prisma.user.upsert({
      where: { id: user.id },
      update: { email },
      create: { id: user.id, email },
    });
  } catch (error) {
    if (!isPrismaUniqueError(error)) {
      throw error;
    }

    const fallbackEmail = `${user.id}@user.local`;

    return prisma.user.upsert({
      where: { id: user.id },
      update: { email: fallbackEmail },
      create: { id: user.id, email: fallbackEmail },
    });
  }
}

