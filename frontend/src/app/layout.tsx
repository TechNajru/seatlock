import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "SeatLock", description: "Secure seat booking for college fests" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
