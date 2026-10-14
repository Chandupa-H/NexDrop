import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexDrop — Parcel Delivery & Courier Management Platform",
  description: "Enterprise parcel delivery, courier fleet tracking, and real-time dispatch logistics platform.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F1F5F1] text-[#1F2937] antialiased">
        {children}
      </body>
    </html>
  );
}
