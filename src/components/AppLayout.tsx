'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for admin and login routes as they have their own auth handling
      if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Check for admin token in localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          router.push('/login');
          return;
        }
      }
      setUser(session?.user || null);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content */}
      <main>
        {children}
      </main>
    </div>
  );
}
