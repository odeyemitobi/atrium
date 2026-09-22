import Link from "next/link";
import { estate, estateOutstandingNgn, units } from "@atrium/seed";
import { formatNgn } from "@/lib/format";

export default function HomePage() {
  const payer = units.find((unit) => unit.code === "B-018")!;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-16">
      <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Cedar Grove · Lekki</p>
      <h1 className="mt-4 text-6xl leading-[0.9]">Atrium</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
        Dues and treasury for Nigerian gated estates. A manager posts a levy. Residents pay in USDC
        from Phantom. Every unit gets a receipt.
      </p>
      <p className="mt-4 text-sm text-[var(--ink)]">
        {estate.name} is carrying {formatNgn(estateOutstandingNgn())} outstanding — the same ledger
        EstateOS already modeled.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/manager"
          className="rounded-full bg-[var(--moss)] px-5 py-3 text-[var(--paper)]"
        >
          Enter as manager
        </Link>
        <Link
          href={`/resident/${payer.code}`}
          className="rounded-full border border-[var(--ink)] px-5 py-3"
        >
          Pay as {payer.name}
        </Link>
      </div>
    </main>
  );
}
