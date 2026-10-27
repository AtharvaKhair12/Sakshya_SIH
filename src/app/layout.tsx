import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth-context';

export const metadata: Metadata = {
  title: 'Sakshya — Evidence & FDR Management Workspace',
  description: 'Official administrative portal for streamlining AICTE security deposit and Fixed Deposit Receipt (FDR) management.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/sakshya-logo.png" />
      </head>
      <body className="min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
