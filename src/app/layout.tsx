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
    // `data-heritage` drives all four ornament surfaces (the chrome banner, the
    // portrait ring, the inspector's 3px bar, the paper wash) — §04: ornament is
    // a setting, not a decision. "full" is the default; "restrained" and "plain"
    // turn the painting down for a projector or a print.
    <html lang="en" data-heritage="full" suppressHydrationWarning>
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
