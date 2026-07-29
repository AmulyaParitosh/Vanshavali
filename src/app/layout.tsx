import AppProvider from "../providers/AppProvider";
import "./globals.css";
import { ToastSystem } from "../components/ToastSystem";

export const metadata = {
  title: "Vanshavali",
  description: "Family Tree Application",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProvider>{children}</AppProvider>
        {/* Toast infrastructure lives outside AppProvider so the transient
         * Loading state during a post-save re-fetch never unmounts an open
         * toast (e.g. the save confirmation + its 12s Undo). It uses no context. */}
        <ToastSystem />
      </body>
    </html>
  );
}
