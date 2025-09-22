import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NotificationProvider } from '@/contexts/NotificationContext';
// Swap to Sonner-based Toaster to match shadcn snippet
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Quiz Management System',
  description: 'A comprehensive quiz management system for admins and students',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <NotificationProvider>
          {children}
          <Toaster />
        </NotificationProvider>
      </body>
    </html>
  );
}
