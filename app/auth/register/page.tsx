"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Check, Eye, EyeSlash, X } from "@phosphor-icons/react";

import {
  registerAccount,
  type ApiErrorShape,
  type ValidationDetail,
} from "@/client/api/auth";
import { toApiMessage } from "@/client/api/http";

type RegisterFieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  form?: string;
};

function mapToRegisterErrors(details?: ValidationDetail[]): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (!details) return errors;

  for (const detail of details) {
    if (detail.path === "fullName") {
      errors.fullName = detail.message;
    }
    if (detail.path === "email") {
      errors.email = detail.message;
    }
    if (detail.path === "password") {
      errors.password = detail.message;
    }
  }
  return errors;
}

// Password validation checks
const passwordChecks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "1 uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "1 number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "1 special character (@, $, !, %, *, ?, &)", test: (p: string) => /[@$!%*?&]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPasswordChecklist, setShowPasswordChecklist] = useState(false);

  const passwordMismatches = password !== confirmPassword && confirmPassword !== "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFieldErrors({});

    try {
      await registerAccount({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      toast.success("Account created successfully.");
      router.push("/search");
      router.refresh();
    } catch (error) {
      if (axios.isAxiosError<ApiErrorShape>(error)) {
        const details = error.response?.data?.details;
        const mapped = mapToRegisterErrors(details);
        const formMessage = error.response?.data?.message;

        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
        }

        if (formMessage) {
          setFieldErrors((prev) => ({ ...prev, form: formMessage }));
        }

        toast.error(formMessage || "Please correct highlighted fields.");
      } else {
        const message = toApiMessage(error, "Network error. Try again.");
        setFieldErrors({ form: message });
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <section className="card-shell-luxury rounded-xl p-8 border-t-4">
        <h1 className="text-3xl font-bold text-text-default">Create Account</h1>
        <p className="mt-2 text-sm text-text-muted">
          Register once and book flights with instant confirmation.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-text-default mb-2">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              className={`field w-full ${fieldErrors.fullName ? "field-error" : ""}`}
            />
            {fieldErrors.fullName && <p className="text-danger-600 text-xs mt-1">{fieldErrors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-text-default mb-2">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={`field w-full ${fieldErrors.email ? "field-error" : ""}`}
            />
            {fieldErrors.email && <p className="text-danger-600 text-xs mt-1">{fieldErrors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-text-default mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onFocus={() => setShowPasswordChecklist(true)}
                placeholder="••••••••"
                className={`field w-full pr-11 ${fieldErrors.password ? "field-error" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="password-toggle focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
              </button>
            </div>

            {/* Password Requirements Checklist */}
            {(showPasswordChecklist || password) && (
              <div className="mt-3 rounded-md border border-border-default bg-surface-muted p-3 space-y-2">
                {passwordChecks.map((check, idx) => {
                  const passes = check.test(password);
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      {passes ? (
                        <Check size={14} weight="bold" className="flex-shrink-0 text-[var(--success-700)]" />
                      ) : (
                        <X size={14} weight="bold" className="text-text-subtle flex-shrink-0" />
                      )}
                      <span className={passes ? "font-medium text-[var(--success-700)]" : "text-text-muted"}>{check.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {fieldErrors.password && <p className="text-danger-600 text-xs mt-1">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-text-default mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                className={`field w-full pr-11 ${passwordMismatches ? "field-error" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="password-toggle focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
              </button>
            </div>
            {passwordMismatches && <p className="text-danger-600 text-xs mt-1">Passwords do not match</p>}
          </div>

          {fieldErrors.form ? (
            <p className="alert-danger text-sm">
              {fieldErrors.form}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || passwordMismatches}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary-accent underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
