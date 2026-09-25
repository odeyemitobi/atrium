"use client";

import { amountPerUnitNgn, levies, type UnitSeed } from "@atrium/seed";
import { useEffect, useState } from "react";
import { PayButton, ReceiptLink } from "@/components/pay-button";
import { formatNgn } from "@/lib/format";
import {
  isLevyPaid,
  loadReceipts,
  saveReceipt,
  unitOutstanding,
  type LocalReceipt
} from "@/lib/ledger";

export function ResidentLedger({ unit }: { unit: UnitSeed }) {
  const [receipts, setReceipts] = useState<LocalReceipt[]>([]);

  useEffect(() => {
    setReceipts(loadReceipts());
  }, []);

  const outstanding = unitOutstanding(unit, receipts);
  const mine = receipts.filter((item) => item.unitCode === unit.code);

  return (
    <div className="space-y-6">
      <article className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Your ledger</p>
        <p className="serif mt-2 text-4xl">{formatNgn(outstanding)}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {outstanding === 0
            ? "This unit is current."
            : "Pay the open levy from Phantom on Solana devnet."}
        </p>
      </article>

      <section className="grid gap-4">
        {levies.map((levy) => {
          const paid = isLevyPaid(unit, levy.id, receipts);
          const receipt = mine.find((item) => item.levyId === levy.id);
          return (
            <article
              key={levy.id}
              className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {levy.kind} · due {levy.due}
                </p>
                <h2 className="mt-1 text-2xl">{levy.name}</h2>
                <p className="mt-2 text-sm">{formatNgn(amountPerUnitNgn(levy))} for this unit</p>
              </div>
              {paid ? (
                <div className="text-right">
                  <p className="text-sm text-[var(--good)]">Paid</p>
                  {receipt ? <ReceiptLink signature={receipt.signature} /> : null}
                </div>
              ) : (
                <PayButton
                  unit={unit}
                  levy={levy}
                  onPaid={(next) => setReceipts(saveReceipt(next))}
                />
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
