import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0369A1] px-6 py-24 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-200">
          Hospital Storage
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Storage Configurator
        </h1>
        <p className="mt-3 text-sky-100">
          Design wall layouts · 2D &amp; 3D preview · Export to PDF
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/configurations/new"
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0369A1] shadow transition-colors hover:bg-sky-50"
          >
            New configuration →
          </Link>
          <Link
            href="/configurations"
            className="rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            My configurations
          </Link>
        </div>
      </div>
    </>
  );
}
