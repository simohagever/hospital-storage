import { type NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_auth";

const ADMIN_PAGE_PREFIX = "/products";
const ADMIN_API_PREFIX = "/api/products";

// Derive a SHA-256 hex digest using the Web Crypto API available in the Edge runtime.
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string comparison — both inputs are always 64-char hex strings
// (SHA-256 output), so length equality is guaranteed in normal operation.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith(ADMIN_PAGE_PREFIX);
  const isAdminApi = pathname.startsWith(ADMIN_API_PREFIX);

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;

  // If ADMIN_SECRET is not configured, deny all access.
  const authed =
    secret && token ? timingSafeEqual(token, await sha256Hex(secret)) : false;

  if (!authed) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin-login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/products/:path*", "/api/products/:path*"],
};
