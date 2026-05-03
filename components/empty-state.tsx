import Image from "next/image";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`cinnamoroll-card flex flex-col items-center justify-center px-4 text-center ${
        compact ? "py-8" : "py-16"
      }`}
    >
      <div
        className={`mb-4 rounded-full bg-gradient-to-br from-[#E1EDFD] to-[#D4E5F7] p-3 ${
          compact ? "h-28 w-28" : "h-40 w-40"
        }`}
      >
        <Image
          src="/assets/cinamoroll_theme/status/loading/loading1.png"
          alt=""
          width={180}
          height={180}
          className="h-full w-full object-contain"
        />
      </div>
      <h3
        className={`mb-2 font-bold text-[#859BB2] ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        {title}
      </h3>
      <p
        className={`max-w-sm text-gray-600 dark:text-gray-400 ${
          compact ? "mb-4 text-xs" : "mb-6 text-sm"
        }`}
      >
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
