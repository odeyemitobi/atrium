import { getUnit } from "@atrium/seed";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { ResidentLedger } from "./ledger";

export default async function ResidentPage({
  params
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: code } = await params;
  const unit = getUnit(decodeURIComponent(code));
  if (!unit) notFound();

  return (
    <Shell eyebrow={`${unit.code} · ${unit.status}`} title={unit.name}>
      <ResidentLedger unit={unit} />
    </Shell>
  );
}
