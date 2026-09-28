"use client";

import { useEffect, useState } from "react";
import { savePasscode, savedPasscode } from "@/lib/solana";

export function PasscodeField() {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(savedPasscode());
  }, []);

  return (
    <label className="glass flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 text-sm">
      <span className="text-xs uppercase tracking-[0.18em] text-(--muted)">Manager passcode</span>
      <input
        type="password"
        autoComplete="current-password"
        placeholder="From the submission's access notes"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          savePasscode(event.target.value);
        }}
        className="min-w-56 flex-1 rounded-xl border border-(--line) bg-(--panel) px-3 py-2"
      />
      <span className="text-xs text-(--muted)">
        Needed to post levies or pay suppliers. The connected manager wallet can skip it for levies.
      </span>
    </label>
  );
}
