import {
  amountPerUnitNgn,
  encodeEstateName,
  levyKindByte,
  levies,
  ngnToUsdcBase,
  units
} from "@atrium/seed";
import {
  DEVNET_USDC_MINT,
  createEstateIx,
  estatePda,
  levyPda,
  postLevyIx,
  registerUnitIx,
  unitPda
} from "@atrium/sdk";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";
const PAYER = new PublicKey("CmfdAFaTL7ujbbHmmXibEFA495L8pQ9wVip3iVcqpFjj");

function loadKeypair(file: string): Keypair {
  const raw = JSON.parse(readFileSync(file, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function send(connection: Connection, payer: Keypair, ...ixs: Transaction["instructions"]) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: payer.publicKey,
    blockhash,
    lastValidBlockHeight
  }).add(...ixs);
  tx.sign(payer);
  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return signature;
}

async function main() {
  const programId = new PublicKey(process.env.NEXT_PUBLIC_ATRIUM_PROGRAM_ID!);
  const manager = loadKeypair(resolve(".deploy/manager.json"));
  const connection = new Connection(RPC, "confirmed");
  const name = encodeEstateName();
  const [estate] = estatePda(manager.publicKey, name, programId);

  console.log("manager", manager.publicKey.toBase58());
  console.log("program", programId.toBase58());
  console.log("estate", estate.toBase58());

  const info = await connection.getAccountInfo(estate);
  if (!info) {
    const sig = await send(
      connection,
      manager,
      createEstateIx({
        manager: manager.publicKey,
        mint: DEVNET_USDC_MINT,
        name,
        programId
      })
    );
    console.log("create_estate", sig);
  } else {
    console.log("estate already exists");
  }

  for (const unit of units) {
    const [unitKey] = unitPda(estate, unit.code, programId);
    if (await connection.getAccountInfo(unitKey)) {
      console.log("unit exists", unit.code);
      continue;
    }
    const sig = await send(
      connection,
      manager,
      registerUnitIx({
        manager: manager.publicKey,
        estate,
        code: unit.code,
        resident: unit.code === "B-018" ? PAYER : manager.publicKey,
        programId
      })
    );
    console.log("register_unit", unit.code, sig);
  }

  for (const [index, levy] of levies.entries()) {
    const [levyKey] = levyPda(estate, index, programId);
    if (await connection.getAccountInfo(levyKey)) {
      console.log("levy exists", levy.id);
      continue;
    }
    const sig = await send(
      connection,
      manager,
      postLevyIx({
        manager: manager.publicKey,
        estate,
        index,
        kind: levyKindByte(levy.kind) as 0 | 1,
        title: levy.name,
        amountPerUnit: ngnToUsdcBase(amountPerUnitNgn(levy)),
        dueTs: levy.dueTs,
        programId
      })
    );
    console.log("post_levy", levy.id, sig);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
