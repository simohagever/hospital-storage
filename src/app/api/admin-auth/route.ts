import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, COOKIE_MAX_AGE } from "@/lib/admin-cookie";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  // Guard against non-object bodies (null, array, primitive) before destructuring.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "password is required" }, { status: 400 });
  }

  const { password } = body as { password?: unknown };
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "password is required" }, { status: 400 });
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin access is not configured" }, { status: 503 });
  }

  if (password !== secret) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Store a SHA-256 hash of the secret rather than the secret itself — if the
  // cookie is ever leaked, it cannot be reused as the admin password directly.
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, sha256Hex(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  // Explicitly pass the same attributes used when setting the cookie so all
  // browsers correctly expire it — some implementations ignore a bare delete
  // if the path doesn't match.
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
