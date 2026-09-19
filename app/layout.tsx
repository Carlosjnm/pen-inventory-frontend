import type { Metadata } from "next";
import "./globals.css";
import UserSessionBar from "@/app/components/UserSessionBar";

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
      <body><UserSessionBar />{children}</body>
    </html>
  );
}
