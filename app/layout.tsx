import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MockForge — Mock APIs without backend code",
    template: "%s · MockForge",
  },
  description:
    "Create reliable mock REST endpoints, shape JSON responses, and inspect requests from one developer-friendly workspace.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
