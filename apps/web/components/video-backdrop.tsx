"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const CLIPS = [
  "/video/estate.mp4",
  "/video/estate-2.mp4",
  "/video/estate-3.mp4",
  "/video/estate-4.mp4",
  "/video/estate-5.mp4"
] as const;

export function VideoBackdrop() {
  const quiet = usePathname() !== "/";
  const [index, setIndex] = useState(0);
  const src = CLIPS[index];
  const nextSrc = CLIPS[(index + 1) % CLIPS.length];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <video
        key={src}
        className="estate-clip h-full w-full scale-105 object-cover"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setIndex((current) => (current + 1) % CLIPS.length)}
      >
        <source src={src} type="video/mp4" />
      </video>
      <video className="hidden" muted playsInline preload="auto" src={nextSrc} />
      <div
        className={
          quiet
            ? "pointer-events-none absolute inset-0 bg-[#14110c]/55"
            : "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#14110c]/75 via-[#14110c]/35 to-[#14110c]/20"
        }
      />
      <div className="scene-grain" />
    </div>
  );
}
