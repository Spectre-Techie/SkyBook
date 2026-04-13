import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  iconLeft?: ReactNode;
};

function getVariantClass(variant: ButtonVariant): string {
  if (variant === "secondary") {
    return "btn-secondary";
  }

  if (variant === "danger") {
    return "btn-danger";
  }

  return "btn-primary";
}

export function Button({
  variant = "primary",
  loading,
  disabled,
  className,
  iconLeft,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${getVariantClass(variant)} inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70 ${className ?? ""}`.trim()}
    >
      {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : iconLeft}
      <span>{children}</span>
    </button>
  );
}
