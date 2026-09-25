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
  decodeEstate,
  estatePda,
  levyPda,
  mintFromEnv,
  payLevyIx,
  postLevyIx,
  programIdFromEnv,
  unitPda,
  type WalletLike
} from "@atrium/sdk";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { formatUsdc } from "@/lib/format";

export const MAX_DEMO_LEVIES = 8;

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

async function sendWalletTx(wallet: WalletLike, ix: ReturnType<typeof payLevyIx>): Promise<string> {
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: wallet.publicKey,
    blockhash,
    lastValidBlockHeight
  }).add(ix);
  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
  return signature;
}

export async function payUnitLevy(args: {
  wallet: WalletLike;
  unitCode: string;
  levyIndex: number;
  amountPerUnit: number;
}): Promise<string> {
  const configured = configuredEstatePda();
  if (!configured) {
    throw new Error(
      "Set NEXT_PUBLIC_ATRIUM_MANAGER after you create the Cedar Grove estate on devnet."
    );
  }

  const { estate: estateKey, programId } = configured;
  const [unit] = unitPda(estateKey, args.unitCode, programId);
  const [levyKey] = levyPda(estateKey, args.levyIndex, programId);
  const mint = mintFromEnv();
  const connection = getConnection();
  const needed = args.amountPerUnit;
  const available = await payerUsdcBalance(connection, args.wallet.publicKey, mint);
  if (available < needed) {
    throw new Error(
      `Need ${formatUsdc(needed)}; Phantom has ${formatUsdc(available)}. Pay Diesel first — it is about 14 USDC and the faucet sent 20.`
    );
  }

  try {
    return await sendWalletTx(
      args.wallet,
      payLevyIx({
        payer: args.wallet.publicKey,
        estate: estateKey,
        unit,
        levy: levyKey,
        mint,
        programId
      })
    );
  } catch (error) {
    throw new Error(friendlyPayError(error, needed));
  }
}

export async function postLevyWithWallet(args: {
  wallet: WalletLike;
  title: string;
  kind: 0 | 1;
  amountPerUnit: number;
  dueTs: number;
}): Promise<string> {
  const configured = configuredEstatePda();
  if (!configured) {
    throw new Error("Set NEXT_PUBLIC_ATRIUM_MANAGER before posting a levy.");
  }
  const manager = managerPubkey();
  if (!manager || !args.wallet.publicKey.equals(manager)) {
    throw new Error("Connect the Cedar Grove manager wallet to post a levy.");
  }

  const connection = getConnection();
  const estateInfo = await connection.getAccountInfo(configured.estate);
  if (!estateInfo) throw new Error("Cedar Grove estate is not on this program yet.");
  const index = decodeEstate(estateInfo.data).levyCount;
  if (index >= MAX_DEMO_LEVIES) {
    throw new Error(`Demo estate already has ${MAX_DEMO_LEVIES} levies.`);
  }

  return sendWalletTx(
    args.wallet,
    postLevyIx({
      manager,
      estate: configured.estate,
      index,
      kind: args.kind,
      title: args.title,
      amountPerUnit: args.amountPerUnit,
      dueTs: args.dueTs,
      programId: configured.programId
    })
  );
}

export async function postLevyViaApi(args: {
  title: string;
  kind: 0 | 1;
  amountNgn: number;
  dueTs: number;
}): Promise<string> {
  const response = await fetch("/api/post-levy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args)
  });
  const payload = (await response.json()) as { signature?: string; error?: string };
  if (!response.ok || !payload.signature) {
    throw new Error(payload.error ?? "Could not post levy.");
  }
  return payload.signature;
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
