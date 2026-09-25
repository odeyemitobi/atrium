import { encodeLevyTitle, ngnToUsdcBase } from "@atrium/seed";
import {
  decodeEstate,
  estatePda,
  encodeEstateName,
  postLevyIx,
  programIdFromEnv
} from "@atrium/sdk";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import { MAX_DEMO_LEVIES } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

type Body = {
  title?: string;
  kind?: number;
  amountNgn?: number;
  dueTs?: number;
};

function managerKeypair(): Keypair {
  const env = process.env.ATRIUM_MANAGER_SECRET;
  if (env) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env) as number[]));
  }
  for (const rel of [".deploy/manager.json", "../../.deploy/manager.json"]) {
    const file = resolve(process.cwd(), rel);
    if (existsSync(file)) {
      return Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(readFileSync(file, "utf8")) as number[])
      );
    }
  }
  throw new Error("Manager key is not configured on this host.");
}

function expectedManager(): PublicKey | null {
  const raw = process.env.NEXT_PUBLIC_ATRIUM_MANAGER;
  return raw ? new PublicKey(raw) : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const title = body.title?.trim() ?? "";
    const kind = body.kind === 1 ? 1 : body.kind === 0 ? 0 : null;
    const amountNgn = Number(body.amountNgn);
    const dueTs = Number(body.dueTs);

    if (!title || title.length > 32) {
      return NextResponse.json({ error: "Title must be 1–32 characters." }, { status: 400 });
    }
    try {
      encodeLevyTitle(title);
    } catch {
      return NextResponse.json({ error: "Title must fit 32 bytes." }, { status: 400 });
    }
    if (kind === null) {
      return NextResponse.json({ error: "Kind must be service or diesel." }, { status: 400 });
    }
    if (!Number.isFinite(amountNgn) || amountNgn < 1_500) {
      return NextResponse.json({ error: "Amount must be at least ₦1,500 per unit." }, { status: 400 });
    }
    if (!Number.isFinite(dueTs) || dueTs < 0) {
      return NextResponse.json({ error: "Due date is required." }, { status: 400 });
    }

    const manager = managerKeypair();
    const expected = expectedManager();
    if (expected && !manager.publicKey.equals(expected)) {
      return NextResponse.json({ error: "Manager key does not match the configured estate." }, { status: 500 });
    }

    const programId = programIdFromEnv();
    const [estate] = estatePda(manager.publicKey, encodeEstateName(), programId);
    const connection = new Connection(RPC, "confirmed");
    const info = await connection.getAccountInfo(estate);
    if (!info) {
      return NextResponse.json({ error: "Cedar Grove estate is not on this program yet." }, { status: 404 });
    }

    const index = decodeEstate(info.data).levyCount;
    if (index >= MAX_DEMO_LEVIES) {
      return NextResponse.json(
        { error: `Demo estate already has ${MAX_DEMO_LEVIES} levies.` },
        { status: 400 }
      );
    }

    const ix = postLevyIx({
      manager: manager.publicKey,
      estate,
      index,
      kind,
      title,
      amountPerUnit: ngnToUsdcBase(Math.round(amountNgn)),
      dueTs: Math.floor(dueTs),
      programId
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: manager.publicKey,
      blockhash,
      lastValidBlockHeight
    }).add(ix);
    tx.sign(manager);
    const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    return NextResponse.json({ signature, index });
  } catch (error) {
    const text = error instanceof Error ? error.message : "Could not post levy.";
    return NextResponse.json({ error: text.split("\n")[0] }, { status: 500 });
  }
}
