"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeSlash } from "@phosphor-icons/react";

import { loginAccount } from "@/client/api/auth";
import { getErrorMessage } from "@/client/api/error-handler";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await loginAccount({
        email: email.trim().toLowerCase(),
        password,
      });

      toast.success("Signed in successfully.");
      
      // Admin auto-detect
      if (response.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (errorValue) {
      const message = getErrorMessage(errorValue, "Invalid email or password");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <section className="card-shell-luxury rounded-xl p-8 border-t-4">
        <h1 className="text-3xl font-bold text-text-default">Welcome back</h1>
        <p className="mt-2 text-sm text-text-muted">
          Sign in to manage bookings, tickets, and account activity.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-default mb-2">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-default mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="field w-full pr-11"
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
          </div>

          {error ? (
            <p className="alert-danger text-sm">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-sm text-text-muted">
          No account yet?{" "}
          <Link href="/auth/register" className="text-primary-accent underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </section>
    </div>
  );
}
