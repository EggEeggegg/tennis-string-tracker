import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "String Tracker 🎾",
  description: "ระบบบันทึกการขึ้นเอ็นเทนนิส",
  manifest: "/manifest.json",
  themeColor: "#0b0f1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
