import AppProvider from '../providers/AppProvider';
import './globals.css';
import { ToastSystem } from '../components/ToastSystem';

export const metadata = {
  title: 'Vanshavali',
  description: 'Family Tree Application',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProvider>
          <ToastSystem />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
