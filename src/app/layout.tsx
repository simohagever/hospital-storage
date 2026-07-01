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
      <body className="flex min-h-full flex-col bg-[#f5f3f0] text-[#1c1917]">
        <nav className="sticky top-0 z-50 border-b border-[#e7e5e4] bg-white/90 shadow-sm backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#292524] text-xs font-bold text-white">
                HS
              </span>
              <span className="text-sm font-semibold text-[#1c1917]">Hospital Storage</span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-md px-3 py-1.5 text-[#78716c] transition-colors hover:bg-[#f5f4f2] hover:text-[#1c1917]">
                Configurations
              </Link>
              <Link href="/configurations/new" className="rounded-md px-3 py-1.5 text-[#78716c] transition-colors hover:bg-[#f5f4f2] hover:text-[#1c1917]">
                New
              </Link>
              <Link href="/products" className="rounded-md px-3 py-1.5 text-[#78716c] transition-colors hover:bg-[#f5f4f2] hover:text-[#1c1917]">
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
