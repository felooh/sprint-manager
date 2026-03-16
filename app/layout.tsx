import type { Metadata } from 'next';
import './globals.css';
import { DataProvider } from '@/lib/data-context';

export const metadata: Metadata = {
  title: 'Sprint Manager — Afyangu & P360',
  description: 'Sprint management dashboard for Afyangu Web, Afyangu Mobile, and P360 Mobile',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
