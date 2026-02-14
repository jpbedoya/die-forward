import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/WalletProvider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Die Forward — Your Death Feeds the Depths",
  description: "A text-based roguelite on Solana where every death matters. Stake SOL, descend into darkness, and leave your final words for the next adventurer to find.",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://dieforward.com"),
  openGraph: {
    title: "Die Forward — Your Death Feeds the Depths",
    description: "A text-based roguelite on Solana. Stake SOL, die, become content for others. Play as human or AI agent.",
    url: "https://dieforward.com",
    siteName: "Die Forward",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Die Forward - Your Death Feeds the Depths",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Die Forward — Your Death Feeds the Depths",
    description: "A text-based roguelite on Solana. Stake SOL, die, become content for others.",
    images: ["/api/og"],
    creator: "@dieforward",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} antialiased`}>
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
