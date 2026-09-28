"use client";

import { getUnit, usdcBaseToNgn } from "@atrium/seed";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchEstateSnapshot,
  fetchSpends,
  type ChainSpend,
  type EstateSnapshot
} from "@/lib/chain";
import { formatNgn, formatUsdc, shortKey } from "@/lib/format";
import { explorerAccount } from "@/lib/ledger";

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function day(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function TreasuryView() {
  const [snapshot, setSnapshot] = useState<EstateSnapshot | null>(null);
  const [spends, setSpends] = useState<ChainSpend[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchEstateSnapshot(), fetchSpends()])
      .then(([nextSnapshot, nextSpends]) => {
        setSnapshot(nextSnapshot);
        setSpends(nextSpends);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not read the treasury.");
      });
  }, []);

  const moneyIn = snapshot ? snapshot.receipts.reduce((sum, item) => sum + item.amount, 0) : 0;
  const moneyOut = spends ? spends.reduce((sum, item) => sum + item.amount, 0) : 0;
  const receipts = snapshot ? [...snapshot.receipts].sort((a, b) => b.paidAt - a.paidAt) : [];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Balance"
          value={snapshot ? formatUsdc(snapshot.treasuryUsdc) : "—"}
          detail={snapshot ? formatNgn(usdcBaseToNgn(snapshot.treasuryUsdc)) : "Reading Devnet…"}
        />
        <Stat label="Paid in" value={formatUsdc(moneyIn)} detail={count(receipts.length, "resident receipt")} />
        <Stat
          label="Paid out"
          value={formatUsdc(moneyOut)}
          detail={count(spends?.length ?? 0, "supplier payment")}
        />
      </section>

      {error ? <p className="text-sm text-(--clay)">{error}</p> : null}

      <section>
        <h2 className="mb-3 text-2xl text-(--paper)">Money out</h2>
        <div className="glass overflow-hidden rounded-2xl">
          {spends && spends.length === 0 ? (
            <p className="px-5 py-4 text-sm text-(--muted)">No supplier payments yet.</p>
          ) : null}
          {(spends ?? []).map((spend) => (
            <Row
              key={spend.address}
              title={spend.memo || "Estate expense"}
              detail={`${day(spend.paidAt)} · to ${shortKey(spend.recipient)}`}
              amount={`− ${formatUsdc(spend.amount)}`}
              href={explorerAccount(spend.address)}
              external
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-2xl text-(--paper)">Money in</h2>
        <div className="glass overflow-hidden rounded-2xl">
          {snapshot && receipts.length === 0 ? (
            <p className="px-5 py-4 text-sm text-(--muted)">No resident payments yet.</p>
          ) : null}
          {receipts.map((receipt) => {
            const levy = snapshot?.levies.find((item) => item.index === receipt.levyIndex);
            const unit = getUnit(receipt.unitCode);
            return (
              <Row
                key={receipt.receipt}
                title={`${receipt.unitCode} · ${levy?.name ?? "Levy"}`}
                detail={`${day(receipt.paidAt)}${unit ? ` · ${unit.name}` : ""}`}
                amount={`+ ${formatUsdc(receipt.amount)}`}
                href={`/receipt/${receipt.receipt}`}
              />
            );
          })}
        </div>
      </section>

      <p className="text-xs text-[#d8d0bf]">
        Read straight from the Atrium program on Solana Devnet. Nobody can edit these rows, including
        the estate manager.
      </p>
    </div>
  );
}

function Row({
  title,
  detail,
  amount,
  href,
  external
}: {
  title: string;
  detail: string;
  amount: string;
  href: string;
  external?: boolean;
}) {
  const body = (
    <>
      <div>
        <p className="text-sm">{title}</p>
        <p className="text-xs text-(--muted)">{detail}</p>
      </div>
      <p className="serif text-lg">{amount}</p>
    </>
  );
  const className =
    "flex items-center justify-between gap-4 border-t border-(--line) px-5 py-4 first:border-t-0 hover:bg-(--panel)";
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="glass rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-(--muted)">{label}</p>
      <p className="serif mt-2 text-3xl">{value}</p>
      <p className="mt-2 text-sm text-(--muted)">{detail}</p>
    </article>
  );
}
