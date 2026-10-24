export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
        AI × Learning × Solana
      </p>
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">
        Turn ideas into playable knowledge.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
        Questory transforms concepts into interactive learning quests, with creator-owned content
        and pay-per-level access.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">Interactive lessons</span>
        <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">Solana x402</span>
        <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">Creator economy</span>
      </div>
    </main>
  );
}
