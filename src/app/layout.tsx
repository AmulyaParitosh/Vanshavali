import AppProvider from '../providers/AppProvider';
import './globals.css';

export const metadata = {
  title: 'Vanshavali',
  description: 'Family Tree Application',
};

import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
