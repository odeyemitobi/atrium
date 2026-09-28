import { encodeEstateName, estatePda, programIdFromEnv } from "@atrium/sdk";
import { Connection, Keypair, PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";
import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

export const PASSCODE_HEADER = "x-atrium-passcode";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

export function serverConnection(): Connection {
  return new Connection(RPC, "confirmed");
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Returns a response to send back when the caller is not allowed, or null when they are. */
export function rejectUnlessManager(request: Request): NextResponse | null {
  const expected = process.env.ATRIUM_MANAGER_PASSCODE;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Manager actions are disabled on this host." }, { status: 503 });
    }
    return null;
  }
  const given = request.headers.get(PASSCODE_HEADER) ?? "";
  if (!timingSafeEqual(digest(given), digest(expected))) {
    return NextResponse.json({ error: "Wrong manager passcode." }, { status: 401 });
  }
  return null;
}

export function managerKeypair(): Keypair {
  const env = process.env.ATRIUM_MANAGER_SECRET;
  if (env) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env) as number[]));
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Manager key is not configured on this host.");
  }
  for (const rel of [".deploy/manager.json", "../../.deploy/manager.json"]) {
    const file = resolve(/*turbopackIgnore: true*/ process.cwd(), rel);
    if (existsSync(file)) {
      return Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(readFileSync(file, "utf8")) as number[])
      );
    }
  }
  throw new Error("Manager key is not configured on this host.");
}

export function managerEstate(): { manager: Keypair; estate: PublicKey; programId: PublicKey } {
  const manager = managerKeypair();
  const raw = process.env.NEXT_PUBLIC_ATRIUM_MANAGER;
  if (raw && !manager.publicKey.equals(new PublicKey(raw))) {
    throw new Error("Manager key does not match the configured estate.");
  }
  const programId = programIdFromEnv();
  const [estate] = estatePda(manager.publicKey, encodeEstateName(), programId);
  return { manager, estate, programId };
}

export async function sendAsManager(
  connection: Connection,
  manager: Keypair,
  ixs: TransactionInstruction[]
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: manager.publicKey, blockhash, lastValidBlockHeight }).add(...ixs);
  tx.sign(manager);
  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return signature;
}

export function errorResponse(error: unknown, fallback: string): NextResponse {
  const text = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: text.split("\n")[0] ?? fallback }, { status: 500 });
}
