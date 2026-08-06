import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Neon Pages', template: '%s — Neon Pages' },
  description: 'Create pages, generate QR codes, and share with the world.',
};

export const viewport: Viewport = {
  themeColor: '#0b0b1a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}