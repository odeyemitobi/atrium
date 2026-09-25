import Link from "next/link";
import { units } from "@atrium/seed";

export default function HomePage() {
  const payer = units.find((unit) => unit.code === "B-018")!;

  return (
    <main className="page-veil pointer-events-none relative flex min-h-screen flex-col justify-between px-6 py-8 text-[var(--paper)] md:px-12">
      <div className="pointer-events-auto flex items-start justify-between gap-8">
        <p className="text-[11px] uppercase tracking-[0.42em] text-[#d8d0bf]">Cedar Grove · Lekki</p>
        <p className="hidden max-w-sm text-right text-sm leading-relaxed text-[#d8d0bf] md:block">
          Dues settle in the hall. Pay in USDC from Phantom.
        </p>
      </div>
      <div className="pointer-events-auto max-w-xl">
        <h1 className="text-7xl leading-[0.82] tracking-[-0.04em] md:text-8xl">Atrium</h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-[#d8d0bf]">
          A living estate. Dues settle in the hall.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/manager"
            className="rounded-full bg-[var(--bronze)] px-5 py-3 text-[#14110c] shadow-lg shadow-[rgba(176,138,74,0.28)]"
          >
            Enter as manager
          </Link>
          <Link
            href={`/resident/${payer.code}`}
            className="rounded-full border border-[var(--paper)]/40 px-5 py-3"
          >
            Pay as {payer.name}
          </Link>
        </div>
      </div>
    </main>
  );
}
