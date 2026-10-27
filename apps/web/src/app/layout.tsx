import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import WalletProviders from "@/components/WalletProviders";

export const metadata: Metadata = {
  title: "Questory",
  description: "Turn ideas into interactive learning quests."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><WalletProviders>{children}</WalletProviders></body>
    </html>
  );
}
