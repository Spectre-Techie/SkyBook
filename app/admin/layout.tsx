'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Airplane,
  ClipboardText,
  House,
  List,
  SignOut,
  UserCircle,
  X,
} from '@phosphor-icons/react';

type SessionPayload = {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'PASSENGER' | 'ADMIN';
  } | null;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        });
        const data = (await response.json()) as SessionPayload;
        setSession(data);

        // Redirect if not admin
        if (!data.authenticated || data.user?.role !== 'ADMIN') {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Session load error:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    }

    void loadSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted">Loading admin panel...</p>
      </div>
    );
  }

  if (!session?.authenticated || session.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-danger-600">Access denied. Admin role required.</p>
      </div>
    );
  }

  const navLinks = [
    {
      href: '/admin/bookings',
      label: 'Review bookings',
      icon: ClipboardText,
    },
    {
      href: '/admin/flights',
      label: 'Manage flights',
      icon: Airplane,
    },
    {
      href: '/',
      label: 'Back to app',
      icon: House,
    },
  ];

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border-default bg-surface-raised lg:flex">
          <div className="border-b border-border-default px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-500)] text-sm font-bold text-[var(--primary-contrast)]">
                SB
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Admin</p>
                <p className="text-lg font-bold text-text-default">SkyBook Console</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="focus-ring inline-flex w-full items-center gap-3 rounded-xl border border-border-default bg-surface-base px-4 py-3 text-sm font-semibold text-text-default transition hover:bg-surface-muted"
              >
                <Icon size={18} weight="duotone" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="space-y-3 border-t border-border-default p-4">
            <div className="rounded-xl border border-border-default bg-surface-base px-4 py-3">
              <p className="text-xs text-text-muted">Logged in as</p>
              <p className="mt-1 truncate text-sm font-semibold text-text-default">{session.user?.fullName || session.user?.email}</p>
              <p className="text-xs text-text-muted">{session.user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--danger-500)] bg-[var(--danger-100)] px-4 py-2.5 text-sm font-semibold text-[var(--danger-700)] transition hover:brightness-95"
            >
              <SignOut size={18} weight="duotone" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border-default bg-surface-base/95 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-surface-raised text-text-default lg:hidden"
                  aria-label="Open admin menu"
                >
                  <List size={18} weight="bold" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Operations</p>
                  <h1 className="text-base font-semibold text-text-default sm:text-lg">Admin Panel</h1>
                </div>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-border-default bg-surface-raised px-3 py-1.5 sm:inline-flex">
                <UserCircle size={18} weight="duotone" className="text-[var(--primary-700)]" />
                <span className="max-w-[240px] truncate text-sm font-medium text-text-default">{session.user?.fullName || session.user?.email}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>

        <div
          className={`fixed inset-0 z-40 lg:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={() => setMobileMenuOpen(false)}
            className={`absolute inset-0 bg-[var(--color-overlay-dark)] transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <aside
            className={`absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col border-r border-border-default bg-surface-raised p-4 shadow-2xl transition-transform duration-300 ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            aria-label="Admin navigation"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Admin menu</p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-surface-base text-text-default"
                aria-label="Close admin menu"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-border-default bg-surface-base px-4 py-3">
              <p className="text-xs text-text-muted">Signed in</p>
              <p className="mt-1 truncate text-sm font-semibold text-text-default">{session.user?.fullName || session.user?.email}</p>
            </div>

            <nav className="mt-4 flex flex-1 flex-col gap-2">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="focus-ring inline-flex w-full items-center gap-3 rounded-xl border border-border-default bg-surface-base px-4 py-3 text-sm font-semibold text-text-default transition hover:bg-surface-muted"
                >
                  <Icon size={18} weight="duotone" />
                  {label}
                </Link>
              ))}
            </nav>

            <button
              onClick={handleLogout}
              className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--danger-500)] bg-[var(--danger-100)] px-4 py-3 text-sm font-semibold text-[var(--danger-700)] transition hover:brightness-95"
            >
              <SignOut size={18} weight="duotone" />
              Sign out
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
