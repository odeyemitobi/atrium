import {
  amountPerUnitNgn,
  getLevy,
  getUnit,
  levies,
  type UnitSeed
} from "@atrium/seed";

export type LocalReceipt = {
  unitCode: string;
  levyId: string;
  signature: string;
  paidAt: string;
  amountNgn: number;
};

const KEY = "atrium.cedar.receipts";

export function loadReceipts(): LocalReceipt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalReceipt[]) : [];
  } catch {
    return [];
  }
}

export function saveReceipt(receipt: LocalReceipt): LocalReceipt[] {
  const next = [
    receipt,
    ...loadReceipts().filter(
      (item) => !(item.unitCode === receipt.unitCode && item.levyId === receipt.levyId)
    )
  ];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function isLevyPaid(unit: UnitSeed, levyId: string, receipts: LocalReceipt[]): boolean {
  if (receipts.some((item) => item.unitCode === unit.code && item.levyId === levyId)) {
    return true;
  }
  return !unit.unpaidLevyIds.includes(levyId);
}

export function unitOutstanding(unit: UnitSeed, receipts: LocalReceipt[]): number {
  const remaining = levies
    .filter((levy) => !isLevyPaid(unit, levy.id, receipts) && unit.unpaidLevyIds.includes(levy.id))
    .reduce((sum, levy) => sum + amountPerUnitNgn(levy), 0);
  if (remaining === 0) return 0;
  return Math.max(remaining, unit.outstandingNgn - paidAgainstSeed(unit, receipts));
}

function paidAgainstSeed(unit: UnitSeed, receipts: LocalReceipt[]): number {
  return receipts
    .filter((item) => item.unitCode === unit.code)
    .reduce((sum, item) => sum + item.amountNgn, 0);
}

export function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function receiptLabel(levyId: string): string {
  return getLevy(levyId)?.name ?? levyId;
}

export function unitLabel(code: string): string {
  const unit = getUnit(code);
  return unit ? `${unit.name} · ${unit.code}` : code;
}
