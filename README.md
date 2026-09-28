# Atrium

Dues and treasury for Nigerian gated estates. A manager posts a service charge or diesel levy; residents pay in USDC on Solana; funds sit in the estate treasury with one receipt per unit.

This is the money rail. [EstateOS](https://github.com/odeyemitobi) stays off-chain ops.

Live demo: [atrium-web-two.vercel.app](https://atrium-web-two.vercel.app/)
Colosseum: [Atrium on Arena](https://colosseum.com/arena/projects/atrium)

## Demo estate

Cedar Grove, Lekki Phase 1 — the same mock used in EstateOS:

- Adaora Nwosu · A-204 · current
- Tunde Bakare · B-018 · ₦85,000 outstanding
- Fatima Bello · C-112 · current
- Kelechi Okafor · D-301 · ₦120,000 outstanding
- May service charge · ₦12.4m · 86% paid
- Diesel levy · ₦3.85m · 64% paid
- Estate outstanding · ₦3.12m

## Repo

```
apps/web          Next.js manager + resident UI
packages/seed     Cedar Grove demo data
packages/sdk      PDAs, instruction builders, Phantom pay
programs/atrium   Anchor program
tests             Seed math + PDA/instruction tests
```

## Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Manager view is `/manager`. Pay as Tunde at `/resident/B-018`.

## Tests

```bash
npm test
npm run test:program
```

Program tests cover account sizes and PDA seeds. They do not need `solana-test-validator`. After the Solana + Anchor CLIs are installed:

```bash
anchor build
anchor test
```

## Pay on devnet

1. Phantom on **devnet**
2. Devnet USDC (Circle mint `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
3. Deploy the program, then set in `apps/web/.env.local`:

```
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_ATRIUM_PROGRAM_ID=GH6m182Lprbfzp4TYwBmTXW3sT6c2ctoF5cyeySRuZkB
NEXT_PUBLIC_ATRIUM_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
NEXT_PUBLIC_ATRIUM_MANAGER=HPE2LaJoEHTsMmfv75bRCADqifyCfappD2hfHGaqEMux
NEXT_PUBLIC_ATRIUM_ESTATE_NAME=Cedar Grove Estate
```

Connect Phantom and pay an unpaid levy. On a phone, the Connect button reopens the page inside the Phantom app. The manager board and resident ledger read treasury, levies, and receipts from Devnet.

From `/manager`, with the manager passcode (`ATRIUM_MANAGER_PASSCODE`), post a levy (`post_levy`) or pay a supplier out of the treasury (`disburse`, which writes a public spend record). `/treasury` lists every payment in and out, and each receipt has a shareable page at `/receipt/<address>`.

Upgrade the deployed program after `cargo +solana build --release --target sbpf-solana-solana` and copying the `.so` to `target/deploy/` with `npm run deploy:devnet`; the script detects an existing program and upgrades it in place.

## Out of scope

Visitors, QR gates, complaints, remittance, naira on-ramps, mainnet.
