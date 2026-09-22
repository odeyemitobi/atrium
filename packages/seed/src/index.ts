export const NGN_PER_USDC = 1500;
export const TOKEN_DECIMALS = 6;
export const OCCUPIED_UNITS = 184;

export type LevyKind = "service" | "diesel";
export type UnitStatus = "owner" | "tenant" | "resident";

export type LevySeed = {
  id: string;
  kind: LevyKind;
  name: string;
  totalNgn: number;
  paidRatio: number;
  due: string;
  dueTs: number;
};

export type UnitSeed = {
  code: string;
  name: string;
  status: UnitStatus;
  phone: string;
  outstandingNgn: number;
  unpaidLevyIds: string[];
};

export type EstateSeed = {
  id: string;
  name: string;
  city: string;
  address: string;
  country: string;
};

export const estate: EstateSeed = {
  id: "estate_cedar_grove",
  name: "Cedar Grove Estate",
  city: "Lagos",
  address: "Lekki Phase 1",
  country: "Nigeria"
};

export const levies: LevySeed[] = [
  {
    id: "may-service",
    kind: "service",
    name: "May service charge",
    totalNgn: 12_400_000,
    paidRatio: 0.86,
    due: "31 May",
    dueTs: 1748649600
  },
  {
    id: "diesel",
    kind: "diesel",
    name: "Diesel levy",
    totalNgn: 3_850_000,
    paidRatio: 0.64,
    due: "03 Jun",
    dueTs: 1748908800
  }
];

export const units: UnitSeed[] = [
  {
    code: "A-204",
    name: "Adaora Nwosu",
    status: "owner",
    phone: "+234 803 118 9012",
    outstandingNgn: 0,
    unpaidLevyIds: []
  },
  {
    code: "B-018",
    name: "Tunde Bakare",
    status: "tenant",
    phone: "+234 809 440 1122",
    outstandingNgn: 85_000,
    unpaidLevyIds: ["may-service", "diesel"]
  },
  {
    code: "C-112",
    name: "Fatima Bello",
    status: "resident",
    phone: "+234 812 654 7781",
    outstandingNgn: 0,
    unpaidLevyIds: []
  },
  {
    code: "D-301",
    name: "Kelechi Okafor",
    status: "tenant",
    phone: "+234 701 009 4410",
    outstandingNgn: 120_000,
    unpaidLevyIds: ["may-service", "diesel"]
  }
];

export function unpaidNgn(levy: LevySeed): number {
  return Math.round(levy.totalNgn * (1 - levy.paidRatio));
}

export function estateOutstandingNgn(list = levies): number {
  return list.reduce((sum, levy) => sum + unpaidNgn(levy), 0);
}

export function namedOutstandingNgn(list = units): number {
  return list.reduce((sum, unit) => sum + unit.outstandingNgn, 0);
}

export function amountPerUnitNgn(levy: LevySeed, occupied = OCCUPIED_UNITS): number {
  return Math.round(levy.totalNgn / occupied);
}

export function ngnToUsdcBase(ngn: number, rate = NGN_PER_USDC): number {
  return Math.round((ngn / rate) * 10 ** TOKEN_DECIMALS);
}

export function usdcBaseToNgn(base: number, rate = NGN_PER_USDC): number {
  return Math.round((base / 10 ** TOKEN_DECIMALS) * rate);
}

export function padBytes(value: string, length: number): Uint8Array {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > length) {
    throw new Error(`"${value}" exceeds ${length} bytes`);
  }
  const out = new Uint8Array(length);
  out.set(bytes);
  return out;
}

export function encodeEstateName(name = estate.name): Uint8Array {
  return padBytes(name, 32);
}

export function encodeUnitCode(code: string): Uint8Array {
  return padBytes(code, 16);
}

export function encodeLevyTitle(title: string): Uint8Array {
  return padBytes(title, 32);
}

export function levyKindByte(kind: LevyKind): number {
  return kind === "service" ? 0 : 1;
}

export function getUnit(code: string): UnitSeed | undefined {
  return units.find((unit) => unit.code === code);
}

export function getLevy(id: string): LevySeed | undefined {
  return levies.find((levy) => levy.id === id);
}
