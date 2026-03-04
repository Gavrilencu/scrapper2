'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

const PUBLIC_PATHS = ['/login', '/setup'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) {
      setAllowed(true);
      setReady(true);
      return;
    }
    fetch('/api/auth/status', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.needsSetup) {
          router.replace('/setup');
          return;
        }
        if (!data.user) {
          router.replace('/login');
          return;
        }
        setAllowed(true);
        setReady(true);
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-slate-400">Se încarcă...</div>
      </div>
    );
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-auto ml-64">{children}</main>
    </>
  );
}
