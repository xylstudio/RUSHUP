import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import ClientProviders from './client-providers';
import AppChrome from '../components/AppChrome';

const inter = Inter({ subsets: ['latin'] });
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'XYL STUDIO',
  description: 'Premium landscape design, estate care, workshops, and customer portal experiences for residences, estates, and enterprise properties.',
  keywords: [
    'landscape design',
    'garden maintenance',
    'estate care',
    'customer portal',
    'landscape services',
    'workshops',
  ],
  openGraph: {
    title: 'XYL STUDIO',
    description: 'Premium landscape services with customer reporting, multi-property management, and trusted service operations.',
    images: ['/og-image.jpg'],
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'XYL STUDIO',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} h-full overflow-x-hidden antialiased`}>
        <ClientProviders>
          <div className="xyl-shell min-h-screen w-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] bg-white">
            <AppChrome>{children}</AppChrome>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
} 