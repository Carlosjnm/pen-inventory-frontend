import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEN Inventory",
  description: "Sistema de Gestão de Inventário PEN",
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
