import type { Metadata } from 'next';
import './globals.css';
import { DataProvider } from '@/lib/data-context';
import { Toaster } from 'sonner';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Delivery Tracker — Afyangu & P360',
  description: 'Goal progress and reporting for Afyangu Web, Afyangu Mobile, and P360 Mobile App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <DataProvider>{children}</DataProvider>
        </Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
