import { encodeLevyTitle, ngnToUsdcBase } from "@atrium/seed";
import { decodeEstate, postLevyIx } from "@atrium/sdk";
import { NextResponse } from "next/server";
import {
  errorResponse,
  managerEstate,
  rejectUnlessManager,
  sendAsManager,
  serverConnection
} from "@/lib/server/manager";
import { MAX_DEMO_LEVIES } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  title?: string;
  kind?: number;
  amountNgn?: number;
  dueTs?: number;
};

export async function POST(request: Request) {
  const denied = rejectUnlessManager(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Body;
    const title = body.title?.trim() ?? "";
    const kind = body.kind === 1 ? 1 : body.kind === 0 ? 0 : null;
    const amountNgn = Number(body.amountNgn);
    const dueTs = Number(body.dueTs);

    if (!title || title.length > 32) {
      return NextResponse.json({ error: "Title must be 1–32 characters." }, { status: 400 });
    }
    try {
      encodeLevyTitle(title);
    } catch {
      return NextResponse.json({ error: "Title must fit 32 bytes." }, { status: 400 });
    }
    if (kind === null) {
      return NextResponse.json({ error: "Kind must be service or diesel." }, { status: 400 });
    }
    if (!Number.isFinite(amountNgn) || amountNgn < 1_500 || amountNgn > 5_000_000) {
      return NextResponse.json(
        { error: "Amount must be between ₦1,500 and ₦5,000,000 per unit." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(dueTs) || dueTs < 0) {
      return NextResponse.json({ error: "Due date is required." }, { status: 400 });
    }

    const { manager, estate, programId } = managerEstate();
    const connection = serverConnection();
    const info = await connection.getAccountInfo(estate);
    if (!info) {
      return NextResponse.json({ error: "Cedar Grove estate is not on this program yet." }, { status: 404 });
    }

    const index = decodeEstate(info.data).levyCount;
    if (index >= MAX_DEMO_LEVIES) {
      return NextResponse.json(
        { error: `Demo estate already has ${MAX_DEMO_LEVIES} levies.` },
        { status: 400 }
      );
    }

    const signature = await sendAsManager(connection, manager, [
      postLevyIx({
        manager: manager.publicKey,
        estate,
        index,
        kind,
        title,
        amountPerUnit: ngnToUsdcBase(Math.round(amountNgn)),
        dueTs: Math.floor(dueTs),
        programId
      })
    ]);

    return NextResponse.json({ signature, index });
  } catch (error) {
    return errorResponse(error, "Could not post levy.");
  }
}
