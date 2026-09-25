"use client";

import { type UnitSeed } from "@atrium/seed";
import { useCallback, useEffect, useState } from "react";
import { PayButton, ReceiptLink } from "@/components/pay-button";
import {
  demoUsdcHint,
  fetchEstateSnapshot,
  isChainPaid,
  receiptFor,
  unitChainOutstanding,
  type EstateSnapshot
} from "@/lib/chain";
import { formatNgn, formatUsdc } from "@/lib/format";

export function ResidentLedger({ unit }: { unit: UnitSeed }) {
  const [snapshot, setSnapshot] = useState<EstateSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freshSigs, setFreshSigs] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      setSnapshot(await fetchEstateSnapshot());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the estate.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const outstanding = snapshot ? unitChainOutstanding(unit.code, snapshot) : unit.outstandingNgn;
  const chainLevies = snapshot?.levies ?? [];

  return (
    <div className="space-y-6">
      <article className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Your ledger</p>
        <p className="serif mt-2 text-4xl">{formatNgn(outstanding)}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {outstanding === 0
            ? "This unit is current on-chain."
            : "Paid state comes from Devnet receipts. The Circle faucet sent 20 USDC — pay Diesel first."}
        </p>
        {error ? <p className="mt-3 text-sm text-[var(--clay)]">{error}</p> : null}
      </article>

      <section className="grid gap-4">
        {chainLevies.map((levy) => {
          const paid = snapshot ? isChainPaid(unit.code, levy.index, snapshot.receipts) : false;
          const receipt = snapshot ? receiptFor(unit.code, levy.index, snapshot.receipts) : undefined;
          return (
            <article
              key={levy.pubkey}
              className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {levy.kind} · due {levy.dueLabel}
                </p>
                <h2 className="mt-1 text-2xl">{levy.name}</h2>
                <p className="mt-2 text-sm">
                  {formatNgn(levy.amountNgn)} · {formatUsdc(levy.amountPerUnit)} for this unit
                </p>
                <p className={`mt-1 text-xs ${levy.amountPerUnit / 1_000_000 <= 20 ? "text-[var(--good)]" : "text-[var(--muted)]"}`}>
                  {demoUsdcHint(levy)}
                </p>
              </div>
              {paid ? (
                <div className="text-right">
                  <p className="text-sm text-[var(--good)]">Paid</p>
                  <ReceiptLink signature={freshSigs[levy.index]} address={receipt?.receipt} />
                </div>
              ) : (
                <PayButton
                  unitCode={unit.code}
                  levy={levy}
                  onPaid={(signature) => {
                    setFreshSigs((current) => ({ ...current, [levy.index]: signature }));
                    void load();
                  }}
                />
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
