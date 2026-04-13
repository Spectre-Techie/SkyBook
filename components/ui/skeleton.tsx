export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-300/70 dark:bg-neutral-700/70 ${className}`.trim()} />;
}
