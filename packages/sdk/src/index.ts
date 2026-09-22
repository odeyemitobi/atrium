import { encodeEstateName, encodeLevyTitle, encodeUnitCode, levyKindByte } from "@atrium/seed";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  Connection,
  type TransactionSignature
} from "@solana/web3.js";
import { sha256 } from "js-sha256";

export const DEFAULT_PROGRAM_ID = new PublicKey(
  "56J6kiYHuu9c1qE3XxhndugKPaqo7oWUNuU5LECBw9UY"
);

export const DEVNET_USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export const SEEDS = {
  estate: "estate",
  unit: "unit",
  levy: "levy",
  receipt: "receipt"
} as const;

export function programIdFromEnv(): PublicKey {
  const raw = process.env.NEXT_PUBLIC_ATRIUM_PROGRAM_ID;
  return raw ? new PublicKey(raw) : DEFAULT_PROGRAM_ID;
}

export function mintFromEnv(): PublicKey {
  const raw = process.env.NEXT_PUBLIC_ATRIUM_MINT;
  return raw ? new PublicKey(raw) : DEVNET_USDC_MINT;
}

export function discriminator(name: string): Buffer {
  return Buffer.from(sha256.digest(`global:${name}`)).subarray(0, 8);
}

export function estatePda(
  manager: PublicKey,
  name = encodeEstateName(),
  programId = programIdFromEnv()
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.estate), manager.toBuffer(), Buffer.from(name)],
    programId
  );
}

export function unitPda(
  estate: PublicKey,
  code: string,
  programId = programIdFromEnv()
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.unit), estate.toBuffer(), Buffer.from(encodeUnitCode(code))],
    programId
  );
}

export function levyPda(
  estate: PublicKey,
  index: number,
  programId = programIdFromEnv()
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(2);
  indexBuf.writeUInt16LE(index);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.levy), estate.toBuffer(), indexBuf],
    programId
  );
}

export function receiptPda(
  levy: PublicKey,
  unit: PublicKey,
  programId = programIdFromEnv()
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.receipt), levy.toBuffer(), unit.toBuffer()],
    programId
  );
}

function u64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function i64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(value));
  return buf;
}

export function createEstateIx(args: {
  manager: PublicKey;
  mint: PublicKey;
  name?: Uint8Array;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = args.programId ?? programIdFromEnv();
  const name = args.name ?? encodeEstateName();
  const [estate] = estatePda(args.manager, name, programId);
  const treasury = getAssociatedTokenAddressSync(args.mint, estate, true);

  const data = Buffer.concat([discriminator("create_estate"), Buffer.from(name)]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.manager, isSigner: true, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: estate, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}

export function registerUnitIx(args: {
  manager: PublicKey;
  estate: PublicKey;
  code: string;
  resident: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = args.programId ?? programIdFromEnv();
  const [unit] = unitPda(args.estate, args.code, programId);
  const data = Buffer.concat([
    discriminator("register_unit"),
    Buffer.from(encodeUnitCode(args.code)),
    args.resident.toBuffer()
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.manager, isSigner: true, isWritable: true },
      { pubkey: args.estate, isSigner: false, isWritable: true },
      { pubkey: unit, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}

export function postLevyIx(args: {
  manager: PublicKey;
  estate: PublicKey;
  index: number;
  kind: 0 | 1;
  title: string;
  amountPerUnit: number;
  dueTs: number;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = args.programId ?? programIdFromEnv();
  const [levy] = levyPda(args.estate, args.index, programId);
  const data = Buffer.concat([
    discriminator("post_levy"),
    Buffer.from([args.kind]),
    Buffer.from(encodeLevyTitle(args.title)),
    u64(args.amountPerUnit),
    i64(args.dueTs)
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.manager, isSigner: true, isWritable: true },
      { pubkey: args.estate, isSigner: false, isWritable: true },
      { pubkey: levy, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}

export function payLevyIx(args: {
  payer: PublicKey;
  estate: PublicKey;
  unit: PublicKey;
  levy: PublicKey;
  mint: PublicKey;
  programId?: PublicKey;
}): TransactionInstruction {
  const programId = args.programId ?? programIdFromEnv();
  const [receipt] = receiptPda(args.levy, args.unit, programId);
  const payerAta = getAssociatedTokenAddressSync(args.mint, args.payer);
  const treasury = getAssociatedTokenAddressSync(args.mint, args.estate, true);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.estate, isSigner: false, isWritable: false },
      { pubkey: args.unit, isSigner: false, isWritable: false },
      { pubkey: args.levy, isSigner: false, isWritable: true },
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: payerAta, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: discriminator("pay_levy")
  });
}

export type WalletLike = {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
};

export async function sendPayLevy(args: {
  connection: Connection;
  wallet: WalletLike;
  estate: PublicKey;
  unit: PublicKey;
  levy: PublicKey;
  mint?: PublicKey;
  programId?: PublicKey;
}): Promise<TransactionSignature> {
  const mint = args.mint ?? mintFromEnv();
  const ix = payLevyIx({
    payer: args.wallet.publicKey,
    estate: args.estate,
    unit: args.unit,
    levy: args.levy,
    mint,
    programId: args.programId
  });

  const { blockhash, lastValidBlockHeight } = await args.connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: args.wallet.publicKey,
    blockhash,
    lastValidBlockHeight
  }).add(ix);

  const signed = await args.wallet.signTransaction(tx);
  const signature = await args.connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false
  });
  await args.connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  });
  return signature;
}

export { levyKindByte, encodeEstateName, encodeUnitCode, encodeLevyTitle };
export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync };
