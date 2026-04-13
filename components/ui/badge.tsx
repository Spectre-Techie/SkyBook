import type { ReactNode } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

const toneClass: Record<BadgeTone, string> = {
  neutral: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100",
  success: "bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300",
  warning: "bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300",
  danger: "bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass[tone]}`}>
      {children}
    </span>
  );
}
