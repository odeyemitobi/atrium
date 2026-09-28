"use client";

import { useState, type FormEvent } from "react";
import { explorerTx } from "@/lib/ledger";
import { disburseViaApi } from "@/lib/solana";

export function SpendForm({
  treasuryUsdc,
  onPaid
}: {
  treasuryUsdc: number | null;
  onPaid: () => void;
}) {
  const [memo, setMemo] = useState("Diesel — Ikeja depot");
  const [recipient, setRecipient] = useState("");
  const [amountNgn, setAmountNgn] = useState(3_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSignature(null);
    setBusy(true);
    try {
      setSignature(await disburseViaApi({ recipient: recipient.trim(), amountNgn, memo: memo.trim() }));
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pay from the treasury.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="glass rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-(--muted)">Pay a supplier</p>
      <h2 className="mt-2 text-2xl">Spend from the treasury</h2>
      <p className="mt-2 text-sm text-(--muted)">
        Sends USDC from the estate treasury and writes a public spend record residents can read on
        the treasury page.
        {treasuryUsdc !== null ? ` Available: ${(treasuryUsdc / 1_000_000).toFixed(2)} USDC.` : ""}
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          What for
          <input
            required
            maxLength={32}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            className="mt-1 w-full rounded-xl border border-(--line) bg-(--panel) px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Naira
          <input
            required
            type="number"
            min={150}
            step={50}
            value={amountNgn}
            onChange={(event) => setAmountNgn(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-(--line) bg-(--panel) px-3 py-2"
          />
        </label>
        <label className="text-sm md:col-span-2">
          Supplier wallet
          <input
            required
            placeholder="Solana address"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            className="mt-1 w-full rounded-xl border border-(--line) bg-(--panel) px-3 py-2 font-mono text-xs"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-(--moss) px-4 py-2 text-sm text-(--paper)"
        >
          {busy ? "Paying on Devnet…" : "Pay supplier"}
        </button>
        {signature ? (
          <a
            href={explorerTx(signature)}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-(--moss) underline-offset-2 hover:underline"
          >
            View on Explorer
          </a>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-(--clay)">{error}</p> : null}
    </form>
  );
}
