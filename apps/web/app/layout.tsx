import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { VideoBackdrop } from "@/components/video-backdrop";
import "./globals.css";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Atrium",
  description: "Dues and treasury for Nigerian gated estates, settled on Solana."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable}`}>
        <Suspense fallback={null}>
          <VideoBackdrop />
        </Suspense>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
