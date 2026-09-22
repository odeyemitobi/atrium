"use client";

import { AddressType } from "@phantom/browser-sdk";
import { PhantomProvider } from "@phantom/react-sdk";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PhantomProvider
      config={{
        providers: ["injected"],
        addressTypes: [AddressType.solana]
      }}
      appName="Atrium"
    >
      {children}
    </PhantomProvider>
  );
}
