"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";

const navItems = [
  {
    href: "/",
    labelKey: "home",
    imageSrc: "/assets/cinamoroll_theme/App Logo/Home.png",
  },
  {
    href: "/categories",
    labelKey: "category",
    imageSrc: "/assets/cinamoroll_theme/App Logo/Category.png",
  },
  {
    href: "/analytics",
    labelKey: "analytics",
    imageSrc: "/assets/cinamoroll_theme/App Logo/Analytics.png",
  },
  {
    href: "/profile",
    labelKey: "settings",
    imageSrc: "/assets/cinamoroll_theme/App Logo/profile.png",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#D4E5F7]/70 bg-[#E1EDFD]/25 px-3 py-2 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/35">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-20 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium text-slate-500 transition",
                active
                  ? "bg-[#E1EDFD] text-[#859BB2] shadow-sm dark:bg-[#B2D7FF]/20 dark:text-[#D4E5F7]"
                  : "hover:bg-[#E1EDFD] hover:text-[#859BB2] dark:hover:bg-slate-900",
              )}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#E1EDFD]">
                <img
                  src={item.imageSrc}
                  alt=""
                  className="h-10 w-10 object-contain"
                />
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
