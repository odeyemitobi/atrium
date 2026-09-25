import Link from "next/link";
import type { ReactNode } from "react";
import { WalletButton } from "./wallet-button";

export function Shell({
  children,
  eyebrow,
  title,
  action
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-veil mx-auto min-h-screen max-w-5xl px-5 py-6">
      <header className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-3">
        <Link href="/" className="serif text-2xl tracking-tight">
          Atrium
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/manager" className="hover:underline">
            Manager
          </Link>
          <Link href="/resident" className="hover:underline">
            Resident
          </Link>
          <WalletButton />
        </nav>
      </header>
      {(eyebrow || title) && (
        <div className="flex flex-wrap items-end justify-between gap-4 py-8">
          <div>
            {eyebrow ? (
              <p className="text-xs uppercase tracking-[0.2em] text-[#d8d0bf]">{eyebrow}</p>
            ) : null}
            {title ? (
              <h1 className="mt-2 text-4xl leading-none text-[var(--paper)]">{title}</h1>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
