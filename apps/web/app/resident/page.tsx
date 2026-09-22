import Link from "next/link";
import { units } from "@atrium/seed";
import { Shell } from "@/components/shell";
import { formatNgn } from "@/lib/format";

export default function ResidentIndexPage() {
  return (
    <Shell eyebrow="Resident" title="Choose your unit">
      <div className="grid gap-4 md:grid-cols-2">
        {units.map((unit) => (
          <Link
            key={unit.code}
            href={`/resident/${unit.code}`}
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 hover:border-[var(--moss)]"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{unit.code}</p>
            <h2 className="mt-2 text-2xl">{unit.name}</h2>
            <p className="mt-2 text-sm capitalize text-[var(--muted)]">{unit.status}</p>
            <p className="mt-4">{formatNgn(unit.outstandingNgn)} outstanding</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
