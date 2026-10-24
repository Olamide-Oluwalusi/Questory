# Questory

Questory is a prototype for turning learning material into interactive, gamified lessons, with Solana x402-style micropayments for unlocking paid content. This repository is a small npm-workspaces monorepo containing a Next.js web app and a TypeScript/Express API.

> **Hackathon MVP status:** this is an early scaffold, not a production-ready payment system. The current code demonstrates the app structure, local course data, syllabus-draft endpoint, and an HTTP `402 Payment Required` challenge for locked lessons. It does **not** yet submit wallet payments, verify on-chain transactions, or persist entitlements.

## Repository layout

```text
questory/
├── apps/
│   └── web/                 # Next.js App Router frontend
│       └── src/
│           ├── app/         # Landing page and global styles
│           └── lib/         # API client helper for fetching a lesson
├── packages/
│   └── backend/             # TypeScript + Express API
│       └── src/
│           ├── data/        # Local mock course content
│           ├── middleware/  # Access challenge and syllabus rate limit
│           ├── routes/      # Course and creator endpoints
│           ├── services/    # Course and in-memory entitlement repositories
│           └── types/
├── .env.example
├── package.json             # npm workspaces and root scripts
└── README.md
```

## Requirements

- Node.js `20.11.0` or newer
- npm 10 or newer

## Get started

Run these commands from the repository root:

```bash
cp .env.example .env
```

Edit `.env` and set valid Solana public keys for the destination and treasury wallets. These are public addresses, not private keys. Do not commit real secrets or wallet keypairs.

Then install dependencies and start both apps:

```bash
npm install
npm run dev
```

Local endpoints:

- Web app: <http://localhost:3000>
- API health check: <http://localhost:4000/health>

You can also run each workspace independently:

```bash
npm run dev:web
npm run dev:api
```

## npm workspaces

The root `package.json` declares `apps/web` and `packages/backend` as workspaces. Install a dependency into the workspace that uses it from the root directory:

```bash
npm install zod --workspace=packages/backend
npm install some-package --workspace=apps/web
```

Running `npm install` at the root resolves dependencies for all declared workspaces and updates the root lockfile. A new package directory only needs to be added to the root `workspaces` array if it is a new workspace; ordinary dependencies do not belong in that array.

## Current API scaffold

### Course content

Mock course content is stored in `packages/backend/src/data/mockData.json`. It currently includes a free introductory level and a paid level for the sample Solana Fundamentals course. The repository reads local JSON so the demo can run without an LLM API key or generation spend.

### Fetching a lesson

The course route is:

```text
GET /api/courses/:courseId/levels/:levelId
```

Free levels can be returned directly. A paid, locked level can return `402 Payment Required` with challenge metadata including:

- `x402-payment-amount`
- `x402-payment-asset`
- `x402-destination-wallet`
- `x402-platform-treasury-wallet`

The client helper in `apps/web/src/lib/level-client.ts` can read the response/challenge, but the wallet-payment and retry flow is not implemented yet.

### Creator syllabus draft

The creator route provides a lightweight, deterministic local syllabus draft and applies an IP rate limit of **3 requests per 15 minutes**. It is a scaffold for the planned free outline → creator approval → heavier content generation workflow. LLM-backed generation and strict generated-content validation remain future work.

### Entitlements and payment verification

The entitlement repository is currently in memory. It is suitable only for a short local demo and loses state when the API process restarts.

**Do not treat a client-supplied transaction signature as proof of payment.** Before granting a paid entitlement, the backend must verify the confirmed transaction on the intended Solana network, expected token mint, exact amount, destination wallet(s), transaction status, action/resource binding, and replay/idempotency protection. The current scaffold intentionally does not grant access solely because a signature is supplied.

The 85% creator / 15% platform split is currently challenge metadata only. It is not yet an implemented on-chain split or completed settlement flow. Do not describe it as funds already being split.

## Planned MVP milestones

1. Complete the lesson flow with the two local sample courses and reliable API error/loading states.
2. Implement a real Devnet wallet payment and server-side transaction verification for a specific lesson unlock.
3. Grant and persist entitlements only after successful verification; prevent transaction replay.
4. Add theory publication and counter-theory actions using the same reusable paid-action/payment-challenge flow.
5. Add theory-specific dispute pricing and paid theory-linking/bonding-curve behavior if time allows.
6. Connect bounded, schema-validated AI generation after the core demo works.

For the hackathon, prioritize a demonstrable end-to-end flow over production infrastructure, but be transparent about any mocked or accounting-only behavior.

## Validation commands

```bash
npm run typecheck
npm run build
```

Run these after installing dependencies. If a command fails, fix the reported issue before treating the scaffold as verified.

## Security notes

- Never commit `.env`, private keys, seed phrases, or wallet keypair files.
- Use Solana Devnet and test wallets during development.
- Keep prices, destination addresses, and allowed paid actions server-controlled; do not trust payment values supplied by the browser.
- The current in-memory entitlement store and payment challenge are prototype-only and are not sufficient for production.
