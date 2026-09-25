"use client";

import { estate, estateOutstandingNgn, OCCUPIED_UNITS, units } from "@atrium/seed";
import { useCallback, useEffect, useState } from "react";
import {
  fetchEstateSnapshot,
  isChainPaid,
  receiptFor,
  unitChainOutstanding,
  type EstateSnapshot
} from "@/lib/chain";
import { formatNgn, formatUsdc, percent } from "@/lib/format";
import { explorerAccount } from "@/lib/ledger";
import Link from "next/link";
import { PostLevyForm } from "./post-levy";

export function ManagerDashboard() {
  const [snapshot, setSnapshot] = useState<EstateSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSnapshot(await fetchEstateSnapshot());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the estate.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const namedOutstanding = snapshot
    ? units.reduce((sum, unit) => sum + unitChainOutstanding(unit.code, snapshot), 0)
    : units.reduce((sum, unit) => sum + unit.outstandingNgn, 0);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Treasury"
          value={snapshot ? formatUsdc(snapshot.treasuryUsdc) : "—"}
          detail={
            snapshot
              ? `${snapshot.receipts.length} on-chain receipt${snapshot.receipts.length === 1 ? "" : "s"}`
              : "Reading Cedar Grove…"
          }
        />
        <Stat
          label="Outstanding"
          value={formatNgn(estateOutstandingNgn())}
          detail="184-unit mock still out on May + diesel"
        />
        <Stat
          label="Named arrears"
          value={formatNgn(namedOutstanding)}
          detail={snapshot ? "Unpaid on-chain levies for the four units" : "Tunde + Kelechi on the board"}
        />
      </section>

      {error ? <p className="mt-6 text-sm text-[var(--clay)]">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-[var(--muted)]">Reading Devnet…</p> : null}

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {(snapshot?.levies.length ? snapshot.levies : []).map((levy) => {
          const boardPaid = snapshot
            ? units.filter((unit) => isChainPaid(unit.code, levy.index, snapshot.receipts)).length
            : 0;
          return (
            <article key={levy.pubkey} className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{levy.kind}</p>
              <h2 className="mt-2 text-2xl">{levy.name}</h2>
              {levy.seedTotalNgn && levy.seedPaidRatio !== undefined ? (
                <>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {formatNgn(levy.seedTotalNgn)} posted · {percent(levy.seedPaidRatio)} collected ·
                    due {levy.dueLabel}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
                    <div
                      className="h-full bg-[var(--moss)]"
                      style={{ width: percent(levy.seedPaidRatio) }}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {formatNgn(levy.amountNgn)} per unit · due {levy.dueLabel}
                </p>
              )}
              <p className="mt-3 text-sm">
                {formatNgn(levy.amountNgn)} per unit · {boardPaid}/{units.length} named units paid
                on-chain
              </p>
            </article>
          );
        })}
      </section>

      <div className="mt-10">
        <PostLevyForm onPosted={() => void load()} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl text-[var(--paper)]">Units</h2>
          <p className="text-sm text-[#d8d0bf]">
            {OCCUPIED_UNITS} occupied · receipts read from Devnet, not this browser
          </p>
        </div>
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-normal">Resident</th>
                <th className="px-4 py-3 font-normal">Unit</th>
                {(snapshot?.levies ?? []).map((levy) => (
                  <th key={levy.pubkey} className="px-4 py-3 font-normal">
                    {levy.name}
                  </th>
                ))}
                <th className="px-4 py-3 font-normal">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.code} className="border-t border-[var(--line)]">
                  <td className="px-4 py-4">
                    <Link href={`/resident/${unit.code}`} className="hover:underline">
                      {unit.name}
                    </Link>
                    <p className="text-xs capitalize text-[var(--muted)]">{unit.status}</p>
                  </td>
                  <td className="px-4 py-4">{unit.code}</td>
                  {(snapshot?.levies ?? []).map((levy) => {
                    const paid = snapshot
                      ? isChainPaid(unit.code, levy.index, snapshot.receipts)
                      : false;
                    const receipt = snapshot
                      ? receiptFor(unit.code, levy.index, snapshot.receipts)
                      : undefined;
                    return (
                      <td key={levy.pubkey} className="px-4 py-4">
                        {paid && receipt ? (
                          <a
                            href={explorerAccount(receipt.receipt)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--good)] underline-offset-2 hover:underline"
                          >
                            Paid
                          </a>
                        ) : (
                          <span className="text-[var(--warn)]">Due</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-4">
                    {formatNgn(snapshot ? unitChainOutstanding(unit.code, snapshot) : unit.outstandingNgn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Estate {estate.name}
          {snapshot ? ` · ${snapshot.estate.slice(0, 4)}…${snapshot.estate.slice(-4)}` : ""}
        </p>
      </section>
    </>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="glass rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="serif mt-2 text-3xl">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
    </article>
  );
}
