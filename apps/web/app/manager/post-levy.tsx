"use client";

import { ngnToUsdcBase } from "@atrium/seed";
import { useState, type FormEvent } from "react";
import { nextDueTs } from "@/lib/chain";
import { connectPhantom, getInjectedPhantom } from "@/lib/phantom";
import { managerPubkey, postLevyViaApi, postLevyWithWallet } from "@/lib/solana";

export function PostLevyForm({ onPosted }: { onPosted: () => void }) {
  const [title, setTitle] = useState("Generator diesel");
  const [kind, setKind] = useState<0 | 1>(1);
  const [amountNgn, setAmountNgn] = useState(15_000);
  const [due, setDue] = useState(() => {
    const date = new Date(nextDueTs() * 1000);
    return date.toISOString().slice(0, 10);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSignature(null);
    setBusy(true);
    try {
      const dueTs = Math.floor(new Date(`${due}T12:00:00Z`).getTime() / 1000);
      const manager = managerPubkey();
      const injected = getInjectedPhantom();
      const connected = injected?.publicKey;
      const next =
        manager && connected && connected.equals(manager)
          ? await postLevyWithWallet({
              wallet: await connectPhantom(),
              title: title.trim(),
              kind,
              amountPerUnit: ngnToUsdcBase(amountNgn),
              dueTs
            })
          : await postLevyViaApi({ title: title.trim(), kind, amountNgn, dueTs });
      setSignature(next);
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post levy.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="glass rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Post a levy</p>
      <h2 className="mt-2 text-2xl">Charge the estate</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Writes <code>post_levy</code> on Devnet. New dues show on every named unit until they pay.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Title
          <input
            required
            maxLength={32}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Kind
          <select
            value={kind}
            onChange={(event) => setKind(Number(event.target.value) as 0 | 1)}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
          >
            <option value={0}>Service charge</option>
            <option value={1}>Diesel</option>
          </select>
        </label>
        <label className="text-sm">
          Naira per unit
          <input
            required
            type="number"
            min={1500}
            step={500}
            value={amountNgn}
            onChange={(event) => setAmountNgn(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Due
          <input
            required
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[var(--moss)] px-4 py-2 text-sm text-[var(--paper)]"
        >
          {busy ? "Posting on Devnet…" : "Post levy"}
        </button>
        {signature ? (
          <a
            href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--moss)] underline-offset-2 hover:underline"
          >
            View on Explorer
          </a>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--clay)]">{error}</p> : null}
    </form>
  );
}
