import type {
  Metadata,
  Viewport,
} from "next";
import "./globals.css";
import UserSessionBar from "@/app/components/UserSessionBar";
import PWARegister from "@/components/PWARegister";
import InstallPEN from "@/components/InstallPEN";

export const metadata: Metadata = {
  title: {
    default: "PEN Inventory",
    template: "%s | PEN Inventory",
  },
  description:
    "Sistema PEN de gestão de inventário, vendas e operações.",
  applicationName: "PEN Inventory",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PEN",
  },
  icons: {
    icon: [
      {
        url: "/icons/pen-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/pen-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/pen-apple-touch.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-AO">
      <body>
        <UserSessionBar />
        {children}
        <InstallPEN />
        <PWARegister />
      </body>
    </html>
  );
}
