"use client";

import { useState } from "react";

export function ShareReceipt({ message, url }: { message: string; url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-(--moss) px-4 py-2 text-sm text-(--paper)"
      >
        Share on WhatsApp
      </a>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => setCopied(true));
        }}
        className="rounded-full border border-(--line) px-4 py-2 text-sm"
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
