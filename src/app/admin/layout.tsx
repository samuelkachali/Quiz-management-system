'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

  return <>{children}</>;
}
