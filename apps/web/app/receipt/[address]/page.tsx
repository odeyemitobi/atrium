import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { formatNgn, formatUsdc, shortKey } from "@/lib/format";
import { explorerAccount } from "@/lib/ledger";
import { loadReceipt } from "@/lib/server/receipt";
import { ShareReceipt } from "./share";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ address: string }> };

function paidLabel(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos"
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const receipt = await loadReceipt((await params).address);
  if (!receipt) return { title: "Receipt not found · Atrium" };
  const title = `${receipt.unitCode} paid ${formatNgn(receipt.amountNgn)} · ${receipt.levyName}`;
  const description = `${receipt.estateName} receipt, recorded on Solana on ${paidLabel(receipt.paidAt)}.`;
  return { title, description, openGraph: { title, description } };
}

export default async function ReceiptPage({ params }: Props) {
  const { address } = await params;
  const receipt = await loadReceipt(address);
  if (!receipt) notFound();

  const host = (await headers()).get("host") ?? "atrium-web.vercel.app";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const url = `${protocol}://${host}/receipt/${receipt.address}`;
  const message = `${receipt.estateName}: ${receipt.unitCode} paid ${formatNgn(receipt.amountNgn)} for ${receipt.levyName}. Receipt: ${url}`;

  return (
    <Shell eyebrow={`${receipt.estateName} · receipt`} title="Paid">
      <article className="glass mx-auto max-w-xl rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-(--muted)">{receipt.levyKind}</p>
            <h2 className="mt-1 text-2xl">{receipt.levyName}</h2>
          </div>
          <span className="rounded-full border border-(--good) px-3 py-1 text-xs uppercase tracking-[0.16em] text-(--good)">
            On-chain
          </span>
        </div>

        <p className="serif mt-6 text-5xl">{formatNgn(receipt.amountNgn)}</p>
        <p className="mt-1 text-sm text-(--muted)">{formatUsdc(receipt.amount)} into the estate treasury</p>

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-(--muted)">Unit</dt>
          <dd>
            {receipt.unitCode}
            {receipt.residentName ? ` · ${receipt.residentName}` : ""}
          </dd>
          <dt className="text-(--muted)">Paid</dt>
          <dd>{paidLabel(receipt.paidAt)} (Lagos)</dd>
          <dt className="text-(--muted)">From wallet</dt>
          <dd className="font-mono text-xs">{shortKey(receipt.payer, 6)}</dd>
          <dt className="text-(--muted)">Receipt</dt>
          <dd>
            <a
              href={explorerAccount(receipt.address)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-(--moss) underline-offset-2 hover:underline"
            >
              {shortKey(receipt.address, 6)}
            </a>
          </dd>
        </dl>

        <ShareReceipt message={message} url={url} />

        <p className="mt-6 text-xs text-(--muted)">
          This page reads the receipt from Solana each time it opens, so it cannot be faked or edited.{" "}
          <Link href="/treasury" className="underline underline-offset-2">
            See the whole treasury
          </Link>
          .
        </p>
      </article>
    </Shell>
  );
}
