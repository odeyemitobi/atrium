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

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Phantom's universal link that reopens this exact page inside the Phantom app's browser. */
export function phantomBrowseUrl(): string {
  const here = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  return `https://phantom.app/ul/browse/${here}?ref=${ref}`;
}

export function needsPhantomApp(): boolean {
  return !injected() && isMobileBrowser();
}

export async function connectPhantom(): Promise<WalletLike> {
  const provider = injected();
  if (!provider) {
    if (isMobileBrowser()) {
      window.location.href = phantomBrowseUrl();
      throw new Error("Opening this page in the Phantom app…");
    }
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
