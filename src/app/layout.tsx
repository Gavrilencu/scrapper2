import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthGuard } from '@/components/AuthGuard';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Scrapper Pro - Extragere date & job-uri planificate',
  description: 'Configurare scraper, baze de date Oracle, job-uri cu scheduler și notificări email.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className={inter.variable}>
      <body className={`min-h-screen flex ${inter.className}`}>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
