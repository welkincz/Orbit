import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeInitScript } from "@/components/theme/ThemeInitScript";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit",
  description: "A local-first professional relationship graph",
  // Everything this app loads is served from this machine. No font host, no
  // CDN, no analytics: the icon is a local SVG and the type is the system UI
  // stack, so the page makes no outbound request on any network.
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
