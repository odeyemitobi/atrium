"use client";

import { usePathname } from "next/navigation";

export function VideoBackdrop() {
  const quiet = usePathname() !== "/";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <video
        className="h-full w-full scale-105 object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        {/* Mixkit: Flying over suburban houses with quiet streets */}
        <source src="/video/estate.mp4" type="video/mp4" />
      </video>
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
