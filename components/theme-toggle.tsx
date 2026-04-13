"use client";

import { Desktop, Moon, Sun } from "@phosphor-icons/react";

import { useTheme, type ThemeMode } from "@/client/theme/theme-provider";

const options: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Desktop },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center rounded-full border border-border-default bg-surface-raised p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-[var(--primary-500)] text-[var(--primary-contrast)]"
                : "text-text-muted hover:bg-surface-muted hover:text-text-default"
            }`}
            aria-label={`Use ${option.label} theme`}
            title={option.label}
          >
            <Icon size={14} weight="bold" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
