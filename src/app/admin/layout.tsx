'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect /admin to /admin/dashboard
    if (pathname === '/admin') {
      router.push('/admin/dashboard');
    }
  }, [pathname, router]);

  // Don't use AppLayout for login/signup pages (they handle their own auth)
  if (pathname === '/admin/login' || pathname === '/admin/signup') {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}
