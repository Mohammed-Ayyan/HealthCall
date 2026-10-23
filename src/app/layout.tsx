import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/platform/auth/authContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareOps AI | Healthcare Operations Intelligence Platform",
  description:
    "Autonomous healthcare operations intelligence platform transforming patient conversations into clinical workflows, prior-authorization, and living hospital synchronization.",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f7f9f6] text-[#142019] flex flex-col font-sans selection:bg-[#10b981]/20 selection:text-[#1b4332]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
