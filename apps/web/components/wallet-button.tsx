"use client";

import { useAccounts, useConnect, useDisconnect } from "@phantom/react-sdk";
import { useState } from "react";
import { shortKey } from "@/lib/format";
import { connectPhantom } from "@/lib/phantom";

export function WalletButton() {
  const { connect, isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const accounts = useAccounts();
  const [fallback, setFallback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const address =
    accounts?.find((item) => "address" in item && typeof item.address === "string")?.address ??
    fallback;

  async function onConnect() {
    setError(null);
    try {
      const result = await connect({ provider: "injected" });
      const next = result?.addresses?.find((item) => item.address)?.address;
      if (next) setFallback(next);
    } catch {
      try {
        const wallet = await connectPhantom();
        setFallback(wallet.publicKey.toBase58());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not connect Phantom.");
      }
    }
  }

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm">
          {shortKey(address)}
        </span>
        <button
          type="button"
          className="text-sm text-[var(--muted)] underline-offset-2 hover:underline"
          onClick={() => {
            setFallback(null);
            void disconnect();
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void onConnect()}
        disabled={isConnecting}
        className="rounded-full bg-[var(--moss)] px-4 py-2 text-sm text-[var(--paper)]"
      >
        {isConnecting ? "Connecting…" : "Connect Phantom"}
      </button>
      {error ? <p className="max-w-56 text-right text-xs text-[var(--clay)]">{error}</p> : null}
    </div>
  );
}
