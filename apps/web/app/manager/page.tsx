import {
  amountPerUnitNgn,
  estate,
  estateOutstandingNgn,
  levies,
  OCCUPIED_UNITS,
  unpaidNgn,
  units
} from "@atrium/seed";
import { Shell } from "@/components/shell";
import { ManagerBoard } from "./board";
import { formatNgn, percent } from "@/lib/format";

export default function ManagerPage() {
  const outstanding = estateOutstandingNgn();

  return (
    <Shell eyebrow={`${estate.address} · ${estate.city}`} title={estate.name}>
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Occupied units" value={String(OCCUPIED_UNITS)} detail="Cedar Grove mock" />
        <Stat
          label="Outstanding"
          value={formatNgn(outstanding)}
          detail="Service charge + diesel unpaid"
        />
        <Stat
          label="Named arrears"
          value={formatNgn(units.reduce((sum, unit) => sum + unit.outstandingNgn, 0))}
          detail="Tunde + Kelechi on the board"
        />
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {levies.map((levy) => (
          <article
            key={levy.id}
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{levy.kind}</p>
            <h2 className="mt-2 text-2xl">{levy.name}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {formatNgn(levy.totalNgn)} posted · {percent(levy.paidRatio)} collected · due {levy.due}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
              <div
                className="h-full bg-[var(--moss)]"
                style={{ width: percent(levy.paidRatio) }}
              />
            </div>
            <p className="mt-3 text-sm">
              {formatNgn(unpaidNgn(levy))} still out · {formatNgn(amountPerUnitNgn(levy))} per unit
            </p>
          </article>
        ))}
      </section>

      <ManagerBoard />
    </Shell>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="serif mt-2 text-3xl">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </article>
  );
}
