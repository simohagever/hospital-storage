"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/configurations", label: "Configurations", match: (p: string) => p.startsWith("/configurations") && p !== "/configurations/new" },
  { href: "/configurations/new", label: "New", match: (p: string) => p === "/configurations/new" },
  { href: "/products", label: "Products", match: (p: string) => p.startsWith("/products") },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 text-sm">
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-4 py-2.5 transition-colors ${
              active
                ? "bg-[#f5f4f2] text-[#1c1917] underline decoration-[#1c1917] underline-offset-4"
                : "text-[#78716c] hover:bg-[#f5f4f2] hover:text-[#1c1917]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
