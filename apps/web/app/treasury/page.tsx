import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { TreasuryView } from "./view";

export const metadata: Metadata = {
  title: "Treasury · Cedar Grove · Atrium",
  description: "Every naira in and out of the Cedar Grove estate treasury, read from Solana."
};

export default function TreasuryPage() {
  return (
    <Shell eyebrow="Cedar Grove · public" title="Treasury">
      <TreasuryView />
    </Shell>
  );
}
