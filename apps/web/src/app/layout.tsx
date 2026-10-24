import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Questory",
  description: "Turn ideas into interactive learning quests."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
