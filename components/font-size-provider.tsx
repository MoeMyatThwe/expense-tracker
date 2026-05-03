"use client";

import { useEffect } from "react";

const FONT_SIZE_KEY = "expense-tracker-font-size";
const FONT_SIZES = {
  compact: "0.92",
  comfortable: "1",
  large: "1.1",
};

export type FontSizeChoice = keyof typeof FONT_SIZES;

export function applyFontSize(choice: FontSizeChoice) {
  document.documentElement.dataset.textSize = choice;
  document.documentElement.style.setProperty(
    "--app-text-scale",
    FONT_SIZES[choice],
  );
  window.localStorage.setItem(FONT_SIZE_KEY, choice);
}

export function getSavedFontSize(): FontSizeChoice {
  if (typeof window === "undefined") return "comfortable";

  const saved = window.localStorage.getItem(FONT_SIZE_KEY);
  if (saved === "compact" || saved === "comfortable" || saved === "large") {
    return saved;
  }

  return "comfortable";
}

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyFontSize(getSavedFontSize());
  }, []);

  return children;
}
