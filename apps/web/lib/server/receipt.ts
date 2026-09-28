import { getUnit, levies, usdcBaseToNgn } from "@atrium/seed";
import { decodeEstate, decodeLevy, decodeReceipt, decodeUnit, programIdFromEnv } from "@atrium/sdk";
import { PublicKey } from "@solana/web3.js";
import { cache } from "react";
import { serverConnection } from "@/lib/server/manager";

const RECEIPT_SIZE = 153;

export type ReceiptView = {
  address: string;
  estateName: string;
  unitCode: string;
  residentName: string | null;
  levyName: string;
  levyKind: "service" | "diesel";
  amount: number;
  amountNgn: number;
  paidAt: number;
  payer: string;
};

export const loadReceipt = cache(async (address: string): Promise<ReceiptView | null> => {
  let key: PublicKey;
  try {
    key = new PublicKey(address);
  } catch {
    return null;
  }

  const connection = serverConnection();
  const info = await connection.getAccountInfo(key);
  if (!info || !info.owner.equals(programIdFromEnv()) || info.data.length !== RECEIPT_SIZE) {
    return null;
  }

  const receipt = decodeReceipt(info.data);
  const [estateInfo, levyInfo, unitInfo] = await connection.getMultipleAccountsInfo([
    receipt.estate,
    receipt.levy,
    receipt.unit
  ]);
  if (!estateInfo || !levyInfo || !unitInfo) return null;

  const levy = decodeLevy(levyInfo.data);
  const unit = decodeUnit(unitInfo.data);
  const seedLevy = levies[levy.index];

  return {
    address: key.toBase58(),
    estateName: decodeEstate(estateInfo.data).name,
    unitCode: unit.code,
    residentName: getUnit(unit.code)?.name ?? null,
    levyName: seedLevy?.name ?? (levy.title || `Levy ${levy.index + 1}`),
    levyKind: levy.kind === 0 ? "service" : "diesel",
    amount: Number(receipt.amount),
    amountNgn: usdcBaseToNgn(Number(receipt.amount)),
    paidAt: Number(receipt.paidAt),
    payer: receipt.payer.toBase58()
  };
});
