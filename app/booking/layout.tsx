'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SessionPayload = {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        });
        const session = (await response.json()) as SessionPayload;

        if (!session.authenticated) {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    }

    void checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return children;
}
