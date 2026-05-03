import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/language-provider";

const loadingFrames = [
  "/assets/cinamoroll_theme/status/loading/loading1.png",
  "/assets/cinamoroll_theme/status/loading/loading2.png",
  "/assets/cinamoroll_theme/status/loading/loading3.png",
];

export function CinnamorollLoader({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <div
      className={`flex min-h-[18rem] flex-col items-center justify-center text-center ${className}`}
    >
      <div className="relative h-44 w-44 sm:h-56 sm:w-56">
        {loadingFrames.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            width={240}
            height={240}
            priority={index === 0}
            className="cinnamoroll-loader-frame absolute inset-0 h-full w-full object-contain"
            style={{ animationDelay: `${index * 0.45}s` }}
          />
        ))}
      </div>
      <p className="mt-3 text-lg font-semibold text-[#859BB2]">
        {label || t("loading")}
      </p>
    </div>
  );
}

export function ExpenseCardSkeleton() {
  return (
    <Card className="cinnamoroll-card p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl bg-[#E1EDFD]" />
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="h-4 w-32 bg-[#E1EDFD]" />
            <Skeleton className="h-5 w-16 bg-[#E1EDFD]" />
          </div>
          <Skeleton className="h-3 w-full bg-[#E1EDFD]" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-24 bg-[#E1EDFD]" />
            <Skeleton className="h-7 w-7 rounded-lg bg-[#E1EDFD]" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card className="cinnamoroll-card animate-pulse">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24 bg-[#E1EDFD]" />
          <Skeleton className="h-8 w-8 rounded-xl bg-[#E1EDFD]" />
        </div>
        <Skeleton className="h-8 w-32 bg-[#E1EDFD]" />
        <Skeleton className="h-3 w-full mt-2 bg-[#E1EDFD]" />
      </div>
    </Card>
  );
}
