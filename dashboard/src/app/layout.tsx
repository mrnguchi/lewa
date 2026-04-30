import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lewa Admin Dashboard",
  description: "Admin dashboard for managing Lewa content, students, payments, and support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#f5f7f6] text-slate-950">{children}</body>
    </html>
  );
}
