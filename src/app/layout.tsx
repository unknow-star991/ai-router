import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Router",
  description:
    "Intelligent AI model router",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}