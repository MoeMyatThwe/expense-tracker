"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const activeTheme = theme || "light";
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ] as const;

  return (
    <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-[#E1EDFD] bg-white/80 p-1 sm:w-auto">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = activeTheme === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            onClick={() => setTheme(option.value)}
            aria-pressed={isActive}
            className={`h-10 rounded-xl px-4 font-semibold ${
              isActive
                ? "bg-[#B2D7FF] text-white shadow-sm hover:bg-[#9AC4E7]"
                : "text-[#859BB2] hover:bg-[#E1EDFD]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
