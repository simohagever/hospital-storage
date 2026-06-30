import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hospital Storage Configurator",
  description: "Wall storage furniture layout tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <nav className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/" className="text-sm font-semibold text-zinc-900 hover:text-zinc-600">
              Hospital Storage
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-zinc-600 hover:text-zinc-900">
                Configurations
              </Link>
              <Link href="/configurations/new" className="text-zinc-600 hover:text-zinc-900">
                New
              </Link>
              <Link href="/products" className="text-zinc-600 hover:text-zinc-900">
                Products
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
