import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
  error?: string;
  id: string;
};

export function Input({ label, helperText, error, id, className, ...props }: InputProps) {
  return (
    <label htmlFor={id} className="block space-y-2 text-sm text-text-muted">
      <span className="font-medium text-text-default">{label}</span>
      <input
        id={id}
        className={`field ${error ? "field-error" : ""} ${className ?? ""}`.trim()}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-help` : undefined}
        {...props}
      />
      {helperText ? (
        <p id={`${id}-help`} className="text-xs text-text-subtle">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger-600">
          {error}
        </p>
      ) : null}
    </label>
  );
}
