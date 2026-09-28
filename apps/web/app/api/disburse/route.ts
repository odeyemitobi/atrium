import { encodeLevyTitle, ngnToUsdcBase } from "@atrium/seed";
import { disburseIx, mintFromEnv, readTokenAmount, treasuryAta } from "@atrium/sdk";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";
import {
  errorResponse,
  managerEstate,
  rejectUnlessManager,
  sendAsManager,
  serverConnection
} from "@/lib/server/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  recipient?: string;
  amountNgn?: number;
  memo?: string;
};

export async function POST(request: Request) {
  const denied = rejectUnlessManager(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Body;
    const memo = body.memo?.trim() ?? "";
    const amountNgn = Number(body.amountNgn);

    let recipient: PublicKey;
    try {
      recipient = new PublicKey(body.recipient?.trim() ?? "");
    } catch {
      return NextResponse.json({ error: "Recipient must be a Solana wallet address." }, { status: 400 });
    }
    if (!memo) {
      return NextResponse.json({ error: "Say what the payment is for." }, { status: 400 });
    }
    try {
      encodeLevyTitle(memo);
    } catch {
      return NextResponse.json({ error: "Memo must fit 32 bytes." }, { status: 400 });
    }
    if (!Number.isFinite(amountNgn) || amountNgn < 150) {
      return NextResponse.json({ error: "Amount must be at least ₦150." }, { status: 400 });
    }

    const amount = ngnToUsdcBase(Math.round(amountNgn));
    const { manager, estate, programId } = managerEstate();
    const mint = mintFromEnv();
    const connection = serverConnection();
    const treasuryInfo = await connection.getAccountInfo(treasuryAta(estate, mint));
    const available = treasuryInfo ? Number(readTokenAmount(treasuryInfo.data)) : 0;
    if (amount > available) {
      return NextResponse.json(
        { error: `Treasury holds ${(available / 1_000_000).toFixed(2)} USDC; that is not enough.` },
        { status: 400 }
      );
    }

    const nonce = BigInt(Date.now());
    const recipientAta = getAssociatedTokenAddressSync(mint, recipient, true);
    const signature = await sendAsManager(connection, manager, [
      createAssociatedTokenAccountIdempotentInstruction(manager.publicKey, recipientAta, recipient, mint),
      disburseIx({
        manager: manager.publicKey,
        estate,
        recipient,
        nonce,
        amount,
        memo,
        mint,
        programId
      })
    ]);

    return NextResponse.json({ signature, nonce: nonce.toString() });
  } catch (error) {
    return errorResponse(error, "Could not pay from the treasury.");
  }
}
