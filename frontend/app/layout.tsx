import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/providers/SocketProvider";
import { CryptoProvider } from "@/providers/CryptoProvider";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Syncro — Совместный просмотр",
  description: "Синхронный просмотр фильмов с E2E-шифрованием",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${syne.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SocketProvider>
          <CryptoProvider>{children}</CryptoProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
