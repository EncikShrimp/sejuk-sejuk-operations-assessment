import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sejuk Sejuk Operations",
  description: "Local operations assessment demo",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" className="h-full antialiased"><body className="flex min-h-full flex-col">{children}</body></html>;
}
