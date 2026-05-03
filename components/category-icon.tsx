"use client";

import Image from "next/image";
import { resolveCategoryIcon } from "@/lib/category-options";

interface CategoryIconProps {
  name?: string;
  className?: string;
}

export function CategoryIcon({
  name,
  className = "h-6 w-6",
}: CategoryIconProps) {
  const src = resolveCategoryIcon(name);

  return (
    <Image
      src={src}
      alt=""
      width={40}
      height={40}
      className={`rounded-full object-cover scale-125 ${className}`}
    />
  );
}
