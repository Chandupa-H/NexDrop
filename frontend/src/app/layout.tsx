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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("nexdrop-theme");var isDark=s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(isDark){document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark");}else{document.documentElement.classList.remove("dark");document.documentElement.setAttribute("data-theme","light");}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
