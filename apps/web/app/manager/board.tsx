"use client";

import { levies, units } from "@atrium/seed";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatNgn } from "@/lib/format";
import { isLevyPaid, loadReceipts, unitOutstanding, type LocalReceipt } from "@/lib/ledger";

export function ManagerBoard() {
  const [receipts, setReceipts] = useState<LocalReceipt[]>([]);

  useEffect(() => {
    setReceipts(loadReceipts());
  }, []);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-2xl text-[var(--paper)]">Units</h2>
        <p className="text-sm text-[#d8d0bf]">Pay from the resident screen. Receipts land here.</p>
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-normal">Resident</th>
              <th className="px-4 py-3 font-normal">Unit</th>
              <th className="px-4 py-3 font-normal">Service</th>
              <th className="px-4 py-3 font-normal">Diesel</th>
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
                {levies.map((levy) => {
                  const paid = isLevyPaid(unit, levy.id, receipts);
                  return (
                    <td key={levy.id} className="px-4 py-4">
                      <span className={paid ? "text-[var(--good)]" : "text-[var(--warn)]"}>
                        {paid ? "Paid" : "Due"}
                      </span>
                    </td>
                  );
                })}
                <td className="px-4 py-4">{formatNgn(unitOutstanding(unit, receipts))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
