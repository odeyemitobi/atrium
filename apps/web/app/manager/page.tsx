import { estate } from "@atrium/seed";
import { Shell } from "@/components/shell";
import { ManagerDashboard } from "./dashboard";

export default function ManagerPage() {
  return (
    <Shell eyebrow={`${estate.address} · ${estate.city}`} title={estate.name}>
      <ManagerDashboard />
    </Shell>
  );
}
