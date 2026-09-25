import {
  amountPerUnitNgn,
  encodeEstateName,
  estate,
  levyKindByte,
  levies,
  ngnToUsdcBase
} from "@atrium/seed";
import {
  DEFAULT_PROGRAM_ID,
  DEVNET_USDC_MINT,
  estatePda,
  levyPda,
  mintFromEnv,
  payLevyIx,
  programIdFromEnv,
  unitPda,
  type WalletLike
} from "@atrium/sdk";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { formatUsdc } from "@/lib/format";

export const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

export function getConnection(): Connection {
  return new Connection(RPC, "confirmed");
}

export function managerPubkey(): PublicKey | null {
  const raw = process.env.NEXT_PUBLIC_ATRIUM_MANAGER;
  return raw ? new PublicKey(raw) : null;
}

export function configuredEstatePda(): { estate: PublicKey; programId: PublicKey } | null {
  const manager = managerPubkey();
  if (!manager) return null;
  const programId = programIdFromEnv();
  const [estateKey] = estatePda(manager, encodeEstateName(), programId);
  return { estate: estateKey, programId };
}

export function levyIndex(levyId: string): number {
  const index = levies.findIndex((levy) => levy.id === levyId);
  if (index < 0) throw new Error(`Unknown levy ${levyId}`);
  return index;
}

export async function payUnitLevy(args: {
  wallet: WalletLike;
  unitCode: string;
  levyId: string;
}): Promise<string> {
  const configured = configuredEstatePda();
  if (!configured) {
    throw new Error(
      "Set NEXT_PUBLIC_ATRIUM_MANAGER after you create the Cedar Grove estate on devnet."
    );
  }

  const levy = levies.find((item) => item.id === args.levyId);
  if (!levy) throw new Error(`Unknown levy ${args.levyId}`);

  const { estate: estateKey, programId } = configured;
  const [unit] = unitPda(estateKey, args.unitCode, programId);
  const [levyKey] = levyPda(estateKey, levyIndex(args.levyId), programId);
  const mint = mintFromEnv();
  const connection = getConnection();
  const needed = ngnToUsdcBase(amountPerUnitNgn(levy));
  const available = await payerUsdcBalance(connection, args.wallet.publicKey, mint);
  if (available < needed) {
    throw new Error(
      `Need ${formatUsdc(needed)}; Phantom has ${formatUsdc(available)}. Pay Diesel first — it is about 14 USDC and the faucet sent 20.`
    );
  }

  const ix = payLevyIx({
    payer: args.wallet.publicKey,
    estate: estateKey,
    unit,
    levy: levyKey,
    mint,
    programId
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: args.wallet.publicKey,
    blockhash,
    lastValidBlockHeight
  }).add(ix);

  try {
    const signed = await args.wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
    return signature;
  } catch (error) {
    throw new Error(friendlyPayError(error, needed));
  }
}

export async function payerUsdcBalance(
  connection: Connection,
  owner: PublicKey,
  mint = mintFromEnv()
): Promise<number> {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  try {
    const account = await getAccount(connection, ata);
    return Number(account.amount);
  } catch {
    return 0;
  }
}

function friendlyPayError(error: unknown, needed: number): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/InvalidAmount|0x1772|6002/i.test(text)) {
    return `Need ${formatUsdc(needed)} in Circle Devnet USDC. Pay Diesel first (about 14 USDC).`;
  }
  if (/User rejected|rejected the request/i.test(text)) {
    return "Payment cancelled in Phantom.";
  }
  return text.split("\n")[0] ?? "Payment failed.";
}

export function levyOnChainAmount(levyId: string): number {
  const levy = levies.find((item) => item.id === levyId);
  if (!levy) return 0;
  return ngnToUsdcBase(amountPerUnitNgn(levy));
}

export { DEFAULT_PROGRAM_ID, DEVNET_USDC_MINT, estate, levyKindByte };
