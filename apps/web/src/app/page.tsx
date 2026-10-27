"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { fetchLevel, payForLevelAndVerify, type LevelResult } from "@/lib/level-client";

const courseId = "solana-fundamentals";

type DemoLevel = { id: string; title: string; price: string };
const levels: DemoLevel[] = [
  { id: "solana-accounts", title: "Solana Accounts", price: "Free" },
  { id: "rent-exempt-storage", title: "Rent-Exempt Storage", price: "0.02 USDC" }
];

export default function HomePage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [busyLevel, setBusyLevel] = useState<string | null>(null);
  const [message, setMessage] = useState("Connect a Devnet wallet to try the lesson access flow.");
  const [lesson, setLesson] = useState<LevelResult | null>(null);

  async function openLevel(level: DemoLevel) {
    setBusyLevel(level.id);
    setLesson(null);
    try {
      const walletAddress = wallet.publicKey?.toBase58() ?? "";
      if (level.price !== "Free" && !walletAddress) {
        setMessage("Connect your wallet before opening a paid level.");
        return;
      }
      const result = await fetchLevel(courseId, level.id, walletAddress);
      if (result.kind === "payment-required") {
        setMessage(`Payment required: ${result.challenge.amount} USDC. Approve the 95/5 split in your wallet to unlock this level.`);
        const signature = await payForLevelAndVerify({ connection, wallet, challenge: result.challenge });
        const unlocked = await fetchLevel(courseId, level.id, wallet.publicKey!.toBase58());
        setLesson(unlocked);
        setMessage(`Payment verified. Transaction: ${signature}`);
      } else {
        setLesson(result);
        setMessage("Lesson loaded.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusyLevel(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12 sm:py-20">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Questory</p>
        <WalletMultiButton />
      </header>
      <section className="py-16 sm:py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">AI × Learning × Solana</p>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">Turn ideas into playable knowledge.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Explore interactive lessons and unlock paid learning with verified Devnet USDC payments.
          Questory&apos;s platform fee is globally configured; creators receive the remainder.
        </p>
      </section>
      <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold">Solana Fundamentals demo</h2>
        <p className="mt-2 text-sm text-slate-400">Platform fee: 5% · Creator share: 95% · Devnet only</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => void openLevel(level)}
              disabled={busyLevel !== null}
              className="rounded-xl border border-slate-700 p-4 text-left transition hover:border-cyan-400 disabled:opacity-60"
            >
              <span className="block font-semibold">{level.title}</span>
              <span className="mt-1 block text-sm text-slate-400">{level.price}</span>
              <span className="mt-3 block text-sm text-cyan-300">
                {busyLevel === level.id ? "Working…" : level.price === "Free" ? "Open lesson" : "Pay and unlock"}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 break-words text-sm text-slate-300" role="status">{message}</p>
        {lesson?.kind === "content" && (
          <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200">{JSON.stringify(lesson.content, null, 2)}</pre>
        )}
      </section>
    </main>
  );
}
