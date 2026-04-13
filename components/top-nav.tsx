"use client";

import {
  AirplaneTakeoff,
  Gauge,
  House,
  List,
  MagnifyingGlass,
  ShieldCheck,
  SignIn,
  SignOut,
  UserPlus,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getSession, logoutAccount, type SessionResponse } from "@/client/api/auth";
import { toApiMessage } from "@/client/api/http";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinkClass =
  "focus-ring inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-raised px-4 py-2 text-sm font-semibold text-text-default transition hover:bg-surface-muted";

const drawerLinkClass =
  "focus-ring inline-flex w-full items-center gap-2 rounded-xl border border-border-default bg-surface-raised px-4 py-3 text-sm font-semibold text-text-default transition hover:bg-surface-muted";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const payload = await getSession().catch(() => ({
        authenticated: false,
        user: null,
      }));

      if (isMounted) {
        setSession(payload);
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const isAuthenticated = session?.authenticated === true;
  const isAdmin = session?.user?.role === "ADMIN";

  const initials = useMemo(() => {
    const name = session?.user?.fullName?.trim();
    if (!name) {
      return "SB";
    }

    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join("");
  }, [session?.user?.fullName]);

  async function handleLogout() {
    setBusy(true);
    try {
      await logoutAccount();
      toast.success("Session closed successfully.");
      setMobileOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(toApiMessage(error, "Unable to sign out right now."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border-default/80 bg-surface-base/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl px-1 py-1">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-base font-bold text-[var(--primary-contrast)]">
            <AirplaneTakeoff size={18} weight="fill" />
          </span>
          <span className="text-lg font-bold tracking-wide text-text-default">SkyBook</span>
        </Link>

        <div className="hidden items-center gap-2 overflow-x-auto md:flex">
          <ThemeToggle />

          <Link href="/search" className={navLinkClass}>
            <MagnifyingGlass size={14} weight="bold" />
            Search
          </Link>

          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className={navLinkClass}>
                <Gauge size={14} weight="bold" />
                Dashboard
              </Link>
              {isAdmin && (
                <Link href="/admin/bookings" className={navLinkClass}>
                  <ShieldCheck size={14} weight="bold" />
                  Admin
                </Link>
              )}
              <div className="ml-1 inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-raised px-3 py-1 text-xs text-text-muted">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-100)] font-bold text-[var(--primary-700)]">
                  {initials}
                </span>
                <span className="hidden font-medium lg:inline">{session?.user?.fullName}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={busy}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-raised px-4 py-2 text-sm font-semibold text-text-default transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
              >
                <SignOut size={14} weight="bold" />
                {busy ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={navLinkClass}>
                <SignIn size={14} weight="bold" />
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-[var(--primary-contrast)] transition hover:brightness-105"
              >
                <UserPlus size={14} weight="bold" />
                Create account
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border-default bg-surface-raised text-text-default"
            aria-label="Open navigation menu"
          >
            <List size={20} weight="bold" />
          </button>
        </div>
      </div>

      <div className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-[var(--color-overlay-dark)] transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col border-l border-border-default bg-surface-base p-4 shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="Mobile navigation"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-[0.24em] text-text-muted">
              Navigation
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-surface-raised text-text-default"
              aria-label="Close menu"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-border-default bg-surface-raised p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-100)] text-sm font-bold text-[var(--primary-700)]">
                {initials}
              </span>
              <div>
                <p className="text-sm font-semibold text-text-default">
                  {isAuthenticated ? session?.user?.fullName : "Guest traveler"}
                </p>
                <p className="text-xs text-text-muted">
                  {isAuthenticated ? "Signed in" : "Not signed in"}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-2" aria-label="Mobile primary links">
            <Link href="/" className={drawerLinkClass}>
              <House size={18} weight="duotone" />
              Home
            </Link>
            <Link href="/search" className={drawerLinkClass}>
              <MagnifyingGlass size={18} weight="duotone" />
              Search flights
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className={drawerLinkClass}>
                  <Gauge size={18} weight="duotone" />
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link href="/admin/bookings" className={drawerLinkClass}>
                    <ShieldCheck size={18} weight="duotone" />
                    Admin panel
                  </Link>
                )}
              </>
            ) : null}
          </nav>

          <div className="mt-5 space-y-2 border-t border-border-default pt-4">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={busy}
                className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-default bg-surface-raised px-4 py-3 text-sm font-semibold text-text-default transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
              >
                <SignOut size={18} weight="bold" />
                {busy ? "Signing out..." : "Sign out"}
              </button>
            ) : (
              <>
                <Link href="/auth/login" className={drawerLinkClass}>
                  <SignIn size={18} weight="duotone" />
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary-500)] to-[var(--primary-600)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition hover:brightness-105"
                >
                  <UserPlus size={18} weight="duotone" />
                  Create account
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>
    </header>
  );
}
