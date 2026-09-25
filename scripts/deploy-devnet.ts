import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";
const BUFFER_HEADER = 37;
const PROGRAM_ACCOUNT_SIZE = 36;
const CHUNK = 850;
const WRITE_GAP_MS = 400;
const LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

function loadKeypair(file: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(file, "utf8")) as number[]));
}

function saveKeypair(file: string, keypair: Keypair) {
  writeFileSync(file, JSON.stringify(Array.from(keypair.secretKey)));
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function writeIx(buffer: PublicKey, authority: PublicKey, offset: number, bytes: Buffer) {
  const data = Buffer.alloc(16 + bytes.length);
  data.writeUInt32LE(1, 0);
  data.writeUInt32LE(offset, 4);
  data.writeBigUInt64LE(BigInt(bytes.length), 8);
  bytes.copy(data, 16);
  return new TransactionInstruction({
    programId: LOADER,
    keys: [
      { pubkey: buffer, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false }
    ],
    data
  });
}

function initializeBufferIx(buffer: PublicKey, authority: PublicKey) {
  return new TransactionInstruction({
    programId: LOADER,
    keys: [
      { pubkey: buffer, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false }
    ],
    data: Buffer.from([0, 0, 0, 0])
  });
}

function deployIx(
  payer: PublicKey,
  program: PublicKey,
  programData: PublicKey,
  buffer: PublicKey,
  authority: PublicKey,
  maxDataLen: number
) {
  const data = Buffer.alloc(12);
  data.writeUInt32LE(2, 0);
  data.writeBigUInt64LE(BigInt(maxDataLen), 4);
  return new TransactionInstruction({
    programId: LOADER,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: programData, isSigner: false, isWritable: true },
      { pubkey: program, isSigner: false, isWritable: true },
      { pubkey: buffer, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false }
    ],
    data
  });
}

function closeIx(closePk: PublicKey, recipient: PublicKey, authority: PublicKey) {
  return new TransactionInstruction({
    programId: LOADER,
    keys: [
      { pubkey: closePk, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false }
    ],
    data: Buffer.from([5, 0, 0, 0])
  });
}

function fees() {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 })
  ];
}

async function send(
  connection: Connection,
  signers: Keypair[],
  ixs: TransactionInstruction[]
) {
  const payer = signers[0];
  let delay = 1500;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({
        feePayer: payer.publicKey,
        blockhash,
        lastValidBlockHeight
      }).add(...fees(), ...ixs);
      tx.sign(...signers);
      const signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 0
      });
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      return signature;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const rateLimited = /429|Too many requests|rate.?limit/i.test(message);
      if (attempt === 12) throw error;
      const wait = rateLimited ? delay : Math.min(delay, 4000);
      console.log(`retry ${attempt}/12 after ${wait}ms: ${message.slice(0, 160)}`);
      await sleep(wait);
      if (rateLimited && delay < 20_000) delay = Math.floor(delay * 1.6);
    }
  }
  throw new Error("send retries exhausted");
}

function writtenOffset(accountData: Buffer, program: Buffer) {
  const stored = accountData.subarray(BUFFER_HEADER);
  let offset = 0;
  const limit = Math.min(stored.length, program.length);
  while (offset < limit && stored[offset] === program[offset]) offset += 1;
  return offset;
}

async function main() {
  const programPath = resolve("target/deploy/atrium.so");
  const manager = loadKeypair(resolve(".deploy/manager.json"));
  const program = loadKeypair(resolve(".deploy/program.json"));
  const bufferPath = resolve(".deploy/buffer.json");
  const programBytes = Buffer.from(readFileSync(programPath));
  const connection = new Connection(RPC, "confirmed");
  const programData = PublicKey.findProgramAddressSync([program.publicKey.toBuffer()], LOADER)[0];

  console.log("rpc", RPC);
  console.log("manager", manager.publicKey.toBase58());
  console.log("program", program.publicKey.toBase58());
  console.log("bytes", programBytes.length);

  const existing = await connection.getAccountInfo(program.publicKey);
  if (existing) {
    throw new Error("program already exists; this script only does the first deploy");
  }

  let buffer = existsSync(bufferPath) ? loadKeypair(bufferPath) : Keypair.generate();
  if (!existsSync(bufferPath)) saveKeypair(bufferPath, buffer);

  const needed = BUFFER_HEADER + programBytes.length;
  let info = await connection.getAccountInfo(buffer.publicKey);

  if (info && info.data.length !== needed) {
    console.log("closing mismatched buffer", buffer.publicKey.toBase58());
    await send(connection, [manager], [closeIx(buffer.publicKey, manager.publicKey, manager.publicKey)]);
    buffer = Keypair.generate();
    saveKeypair(bufferPath, buffer);
    info = null;
  }

  if (!info) {
    const lamports = await connection.getMinimumBalanceForRentExemption(needed);
    console.log("creating buffer", buffer.publicKey.toBase58(), "rent", lamports);
    await send(connection, [manager, buffer], [
      SystemProgram.createAccount({
        fromPubkey: manager.publicKey,
        newAccountPubkey: buffer.publicKey,
        lamports,
        space: needed,
        programId: LOADER
      }),
      initializeBufferIx(buffer.publicKey, manager.publicKey)
    ]);
    info = await connection.getAccountInfo(buffer.publicKey);
  }

  let offset = info ? writtenOffset(Buffer.from(info.data), programBytes) : 0;
  console.log("resume offset", offset, "/", programBytes.length);

  while (offset < programBytes.length) {
    const bytes = programBytes.subarray(offset, offset + CHUNK);
    await send(connection, [manager], [writeIx(buffer.publicKey, manager.publicKey, offset, Buffer.from(bytes))]);
    offset += bytes.length;
    if (offset % (CHUNK * 8) < CHUNK || offset === programBytes.length) {
      console.log(`wrote ${offset}/${programBytes.length}`);
    }
    await sleep(WRITE_GAP_MS);
  }

  const programLamports = await connection.getMinimumBalanceForRentExemption(PROGRAM_ACCOUNT_SIZE);
  console.log("deploying program account");
  const sig = await send(connection, [manager, program], [
    SystemProgram.createAccount({
      fromPubkey: manager.publicKey,
      newAccountPubkey: program.publicKey,
      lamports: programLamports,
      space: PROGRAM_ACCOUNT_SIZE,
      programId: LOADER
    }),
    deployIx(
      manager.publicKey,
      program.publicKey,
      programData,
      buffer.publicKey,
      manager.publicKey,
      programBytes.length
    )
  ]);

  const deployed = await connection.getAccountInfo(program.publicKey);
  if (!deployed) throw new Error("deploy tx landed but program account is missing");
  console.log("deployed", program.publicKey.toBase58(), sig);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
