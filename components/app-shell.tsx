"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !pathname.startsWith("/auth");

  return (
    <>
      <main className={showNav ? "pb-24" : undefined}>{children}</main>
      <BottomNav />
    </>
  );
}
