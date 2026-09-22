import {
  amountPerUnitNgn,
  encodeEstateName,
  encodeUnitCode,
  estate,
  estateOutstandingNgn,
  levyKindByte,
  levies,
  namedOutstandingNgn,
  ngnToUsdcBase,
  OCCUPIED_UNITS,
  unpaidNgn,
  units
} from "../packages/seed/src/index";
import {
  DEFAULT_PROGRAM_ID,
  discriminator,
  estatePda,
  levyPda,
  receiptPda,
  unitPda
} from "../packages/sdk/src/index";
import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

describe("Cedar Grove seed", () => {
  it("keeps EstateOS levy totals and the ₦3.1m outstanding story", () => {
    expect(estate.name).toBe("Cedar Grove Estate");
    expect(estate.address).toBe("Lekki Phase 1");
    expect(levies[0]?.totalNgn).toBe(12_400_000);
    expect(levies[1]?.totalNgn).toBe(3_850_000);
    expect(unpaidNgn(levies[0]!)).toBe(1_736_000);
    expect(unpaidNgn(levies[1]!)).toBe(1_386_000);
    expect(estateOutstandingNgn()).toBe(3_122_000);
  });

  it("keeps the four named units and their ledgers", () => {
    expect(units.map((unit) => unit.code)).toEqual(["A-204", "B-018", "C-112", "D-301"]);
    expect(units.find((unit) => unit.code === "B-018")?.outstandingNgn).toBe(85_000);
    expect(units.find((unit) => unit.code === "D-301")?.outstandingNgn).toBe(120_000);
    expect(namedOutstandingNgn()).toBe(205_000);
    expect(namedOutstandingNgn()).toBeLessThan(estateOutstandingNgn());
  });

  it("splits estate levies across 184 occupied units", () => {
    expect(OCCUPIED_UNITS).toBe(184);
    expect(amountPerUnitNgn(levies[0]!)).toBe(67_391);
    expect(amountPerUnitNgn(levies[1]!)).toBe(20_924);
  });

  it("converts naira to USDC base units at the seeded rate", () => {
    expect(ngnToUsdcBase(1_500)).toBe(1_000_000);
    expect(levyKindByte("service")).toBe(0);
    expect(levyKindByte("diesel")).toBe(1);
  });
});

describe("program addresses", () => {
  it("uses Anchor 8-byte instruction discriminators", () => {
    expect(discriminator("create_estate")).toHaveLength(8);
    expect(discriminator("pay_levy")).toHaveLength(8);
    expect(discriminator("create_estate").equals(discriminator("pay_levy"))).toBe(false);
  });

  it("derives distinct PDAs for estate, unit, levy, and receipt", () => {
    const manager = Keypair.generate().publicKey;
    const name = encodeEstateName();
    const [estateKey] = estatePda(manager, name, DEFAULT_PROGRAM_ID);
    const [unit] = unitPda(estateKey, "B-018", DEFAULT_PROGRAM_ID);
    const [levy] = levyPda(estateKey, 0, DEFAULT_PROGRAM_ID);
    const [receipt] = receiptPda(levy, unit, DEFAULT_PROGRAM_ID);

    const keys = [estateKey, unit, levy, receipt].map((key) => key.toBase58());
    expect(new Set(keys).size).toBe(4);
    expect(encodeUnitCode("B-018")[0]).toBe("B".charCodeAt(0));
  });
});
