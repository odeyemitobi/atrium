"use client";

import { amountPerUnitNgn, type LevySeed, type UnitSeed } from "@atrium/seed";
import { useState } from "react";
import { formatNgn } from "@/lib/format";
import { explorerTx, type LocalReceipt } from "@/lib/ledger";
import { connectPhantom } from "@/lib/phantom";
import { payUnitLevy } from "@/lib/solana";

export function PayButton({
  unit,
  levy,
  onPaid
}: {
  unit: UnitSeed;
  levy: LevySeed;
  onPaid: (receipt: LocalReceipt) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const wallet = await connectPhantom();
      const signature = await payUnitLevy({
        wallet,
        unitCode: unit.code,
        levyId: levy.id
      });
      onPaid({
        unitCode: unit.code,
        levyId: levy.id,
        signature,
        paidAt: new Date().toISOString(),
        amountNgn: amountPerUnitNgn(levy)
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Payment failed.";
      setError(text.split("\n")[0] ?? "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void pay()}
        disabled={busy}
        className="rounded-full bg-[var(--moss)] px-4 py-2 text-sm text-[var(--paper)]"
      >
        {busy ? "Paying on devnet…" : `Pay ${formatNgn(amountPerUnitNgn(levy))}`}
      </button>
      {error ? <p className="max-w-xs text-right text-xs text-[var(--clay)]">{error}</p> : null}
    </div>
  );
}

export function ReceiptLink({ signature }: { signature: string }) {
  return (
    <a
      href={explorerTx(signature)}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-[var(--moss)] underline-offset-2 hover:underline"
    >
      View receipt
    </a>
  );
}
