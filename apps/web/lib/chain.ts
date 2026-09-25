import {
  amountPerUnitNgn,
  levies,
  ngnToUsdcBase,
  units,
  usdcBaseToNgn,
  type LevyKind
} from "@atrium/seed";
import {
  decodeEstate,
  decodeLevy,
  decodeReceipt,
  levyPda,
  mintFromEnv,
  readTokenAmount,
  receiptPda,
  treasuryAta,
  unitPda
} from "@atrium/sdk";
import { PublicKey } from "@solana/web3.js";
import { configuredEstatePda, getConnection } from "@/lib/solana";

export type ChainLevy = {
  index: number;
  id: string;
  kind: LevyKind;
  name: string;
  amountPerUnit: number;
  amountNgn: number;
  dueTs: number;
  dueLabel: string;
  paidCount: number;
  pubkey: string;
  seedTotalNgn?: number;
  seedPaidRatio?: number;
};

export type ChainReceipt = {
  unitCode: string;
  levyIndex: number;
  payer: string;
  amount: number;
  paidAt: number;
  receipt: string;
};

export type EstateSnapshot = {
  estate: string;
  name: string;
  unitCount: number;
  levyCount: number;
  treasuryUsdc: number;
  levies: ChainLevy[];
  receipts: ChainReceipt[];
};

const MAX_LEVIES = 12;

function dueLabel(ts: number): string {
  if (!ts) return "open";
  return new Date(ts * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

function toChainLevy(
  index: number,
  decoded: ReturnType<typeof decodeLevy>,
  pubkey: PublicKey
): ChainLevy {
  const seed = levies[index];
  const amountPerUnit = Number(decoded.amountPerUnit);
  return {
    index,
    id: seed?.id ?? `levy-${index}`,
    kind: decoded.kind === 0 ? "service" : "diesel",
    name: seed?.name ?? (decoded.title || `Levy ${index + 1}`),
    amountPerUnit,
    amountNgn: seed ? amountPerUnitNgn(seed) : usdcBaseToNgn(amountPerUnit),
    dueTs: Number(decoded.dueTs),
    dueLabel: seed?.due ?? dueLabel(Number(decoded.dueTs)),
    paidCount: decoded.paidCount,
    pubkey: pubkey.toBase58(),
    seedTotalNgn: seed?.totalNgn,
    seedPaidRatio: seed?.paidRatio
  };
}

export async function fetchEstateSnapshot(): Promise<EstateSnapshot> {
  const configured = configuredEstatePda();
  if (!configured) {
    throw new Error("Set NEXT_PUBLIC_ATRIUM_MANAGER to read Cedar Grove on-chain.");
  }

  const { estate, programId } = configured;
  const mint = mintFromEnv();
  const connection = getConnection();
  const estateInfo = await connection.getAccountInfo(estate);
  if (!estateInfo) {
    throw new Error("Cedar Grove estate is not on this program yet.");
  }

  const decodedEstate = decodeEstate(estateInfo.data);
  const levyCount = Math.min(decodedEstate.levyCount, MAX_LEVIES);
  const levyKeys = Array.from({ length: levyCount }, (_, index) => levyPda(estate, index, programId)[0]);
  const unitKeys = units.map((unit) => unitPda(estate, unit.code, programId)[0]);
  const receiptKeys = levyKeys.flatMap((levyKey) =>
    unitKeys.map((unitKey) => receiptPda(levyKey, unitKey, programId)[0])
  );
  const treasury = treasuryAta(estate, mint);

  const keys = [...levyKeys, treasury, ...receiptKeys];
  const infos = keys.length ? await connection.getMultipleAccountsInfo(keys) : [];
  const levyInfos = infos.slice(0, levyKeys.length);
  const treasuryInfo = infos[levyKeys.length] ?? null;
  const receiptInfos = infos.slice(levyKeys.length + 1);

  const chainLevies = levyInfos.flatMap((info, index) => {
    if (!info) return [];
    return [toChainLevy(index, decodeLevy(info.data), levyKeys[index]!)];
  });

  const treasuryUsdc = treasuryInfo ? Number(readTokenAmount(treasuryInfo.data)) : 0;

  const receipts: ChainReceipt[] = [];
  receiptInfos.forEach((info, flat) => {
    if (!info) return;
    const levyIndex = Math.floor(flat / unitKeys.length);
    const unit = units[flat % unitKeys.length];
    if (!unit) return;
    const decoded = decodeReceipt(info.data);
    receipts.push({
      unitCode: unit.code,
      levyIndex,
      payer: decoded.payer.toBase58(),
      amount: Number(decoded.amount),
      paidAt: Number(decoded.paidAt),
      receipt: receiptKeys[flat]!.toBase58()
    });
  });

  return {
    estate: estate.toBase58(),
    name: decodedEstate.name,
    unitCount: decodedEstate.unitCount,
    levyCount: decodedEstate.levyCount,
    treasuryUsdc,
    levies: chainLevies,
    receipts
  };
}

export function isChainPaid(
  unitCode: string,
  levyIndex: number,
  receipts: ChainReceipt[]
): boolean {
  return receipts.some((item) => item.unitCode === unitCode && item.levyIndex === levyIndex);
}

export function unitChainOutstanding(unitCode: string, snapshot: EstateSnapshot): number {
  return snapshot.levies
    .filter((levy) => !isChainPaid(unitCode, levy.index, snapshot.receipts))
    .reduce((sum, levy) => sum + levy.amountNgn, 0);
}

export function receiptFor(
  unitCode: string,
  levyIndex: number,
  receipts: ChainReceipt[]
): ChainReceipt | undefined {
  return receipts.find((item) => item.unitCode === unitCode && item.levyIndex === levyIndex);
}

export function demoUsdcHint(levy: ChainLevy): string {
  const usdc = levy.amountPerUnit / 1_000_000;
  if (usdc <= 20) return "Demo pay — covered by 20 USDC";
  return `Needs ~${Math.ceil(usdc)} USDC — more than the faucet sent`;
}

export function nextDueTs(days = 14): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

export function seededAmountPerUnit(levyId: string): number {
  const levy = levies.find((item) => item.id === levyId);
  if (!levy) return 0;
  return ngnToUsdcBase(amountPerUnitNgn(levy));
}
