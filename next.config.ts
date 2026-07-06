import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy notes:
// - 'unsafe-inline' on script-src is required by Next.js hydration chunks and Tailwind — standard practice.
// - 'unsafe-eval' is added in dev only (Next.js HMR requires it; production omits it).
// - data: and blob: on img-src support jsPDF / html-to-image exports and canvas captures.
// - blob: on worker-src supports Three.js geometry workers.
// - If you add external services (Google Analytics, chat widgets, etc.) later, add their
//   domains to script-src and connect-src here, otherwise they will be blocked silently.
// - Watch the browser Console on first launch: "Refused to load..." messages indicate a
//   legitimate resource that needs to be added to the relevant CSP directive.
const cspValue = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src blob:",
  "frame-ancestors 'none'",
].join("; ");

const baseHeaders = [
  { key: "Content-Security-Policy", value: cspValue },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// HSTS is omitted in dev — localhost is not HTTPS and this header would break
// browser dev tools. In production it tells browsers to always use HTTPS for 1 year.
const prodOnlyHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: isDev ? baseHeaders : [...baseHeaders, ...prodOnlyHeaders],
      },
    ];
  },

  images: {
    remotePatterns: [
      // Add cloud storage domains here when you move product images off local disk.
      // Example for Google Cloud Storage:
      // { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
};

export default nextConfig;
