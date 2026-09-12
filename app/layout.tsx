import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEN Inventory",
  description: "PEN Inventory Management System",
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
