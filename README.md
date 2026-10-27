# Questory

Questory is an AI-powered interactive learning platform concept built around playable lessons and pay-per-level access using Solana x402-style payment challenges.

## Workspace

- `apps/web` — Next.js App Router frontend with a Phantom wallet connection and a small Devnet payment demo.
- `packages/backend` — Express + TypeScript API, mock course data, access middleware, payment verification, and deterministic syllabus-draft placeholder.

## Requirements

- Node.js 20.11+
- npm
- Phantom (or compatible injected Solana wallet) configured for Devnet
- Devnet USDC for the paid-level demo

## Setup

```bash
cp .env.example .env
npm install
```

Set `QUESTORY_TREASURY_WALLET` to a valid Solana public key that is different from the creator wallet in the demo course. Never put a private key in `.env` or commit one. The default `QUESTORY_USDC_MINT` is the Devnet USDC mint; use a matching mint and RPC when changing networks.

Run both applications:

```bash
npm run dev
```

- Web: http://localhost:3000
- API health: http://localhost:4000/health

Run checks/builds:

```bash
npm run typecheck
npm run build
```

## Payment flow implemented in this scaffold

1. Free levels are returned without a wallet or payment.
2. An unpaid paid level returns HTTP `402 Payment Required` with the amount, USDC mint, creator wallet, platform treasury, and configured fee in headers and JSON.
3. The frontend constructs a Devnet USDC transaction with a memo binding the payment to the wallet/course/level and two checked token transfers: creator share and platform share.
4. The backend independently fetches the confirmed transaction from the configured Solana RPC and verifies the signer, memo, mint, source token account, exact amounts, and expected recipient token accounts before granting the entitlement.
5. The transaction signature is guarded against reuse within the running backend process.

The global fee is `QUESTORY_PLATFORM_FEE_BPS` in basis points (`500` = 5%). The creator receives the remainder (95% at the default). No per-creator fee override exists. The fee is applied uniformly to paid levels. `x402CostUSDC` is currently stored per paid level in the mock course data, so the backend already has a data field for different level prices; a creator-facing price editor is not exposed.

## Important MVP limitations

- Course data, entitlements, and used-payment-signature tracking are in memory/mock JSON. Entitlements and replay protection reset when the API restarts and are not safe for production. Before launch, move them to a durable database with unique constraints and transactional/idempotent verification.
- The demo uses a single configured Devnet USDC mint and the legacy SPL Token Program. It is not mainnet-ready.
- The buyer pays network fees and may pay to create missing recipient associated token accounts.
- The course creator and platform treasury must be different wallets for the split to work as intended.
- Creator pricing UI is intentionally not included. Edit `x402CostUSDC` in the mock data for local testing.
- Syllabus drafting is deterministic local placeholder logic, not an LLM integration. Heavy syllabus generation returns `501` until a provider is configured.
- This is an x402-style HTTP 402 flow, not yet a complete implementation of a standardized external x402 protocol specification.

## Relevant API routes

- `GET /health`
- `GET /api/courses/:courseId/levels/:levelId`
- `POST /api/payments/verify`
- `POST /api/creator/syllabus/draft`
- `POST /api/creator/syllabus/generate` (placeholder: `501`)
