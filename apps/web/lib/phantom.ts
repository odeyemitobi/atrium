"use client";

import { PublicKey, Transaction } from "@solana/web3.js";
import type { WalletLike } from "@atrium/sdk";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

function injected(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const solana = (window as Window & { solana?: PhantomProvider }).solana;
  return solana?.isPhantom ? solana : solana ?? null;
}

export async function connectPhantom(): Promise<WalletLike> {
  const provider = injected();
  if (!provider) {
    throw new Error("Install the Phantom browser extension and switch it to Devnet.");
  }
  const next = await provider.connect();
  const publicKey = next.publicKey ?? provider.publicKey;
  if (!publicKey) throw new Error("Phantom did not return a public key.");
  return {
    publicKey,
    signTransaction: (tx) => provider.signTransaction(tx)
  };
}

export function getInjectedPhantom(): PhantomProvider | null {
  return injected();
}
