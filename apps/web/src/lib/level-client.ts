import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

export type X402Challenge = {
  courseId: string;
  levelId: string;
  amount: string;
  asset: string;
  usdcMint: string;
  creatorWallet: string;
  treasuryWallet: string;
  creatorAmount: string;
  platformAmount: string;
  platformFeeBps: number;
};

export type LevelResult =
  | { kind: "content"; content: unknown }
  | { kind: "payment-required"; challenge: X402Challenge };

const baseUrl = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function fetchLevel(courseId: string, levelId: string, walletAddress: string): Promise<LevelResult> {
  const response = await fetch(
    `${baseUrl()}/api/courses/${encodeURIComponent(courseId)}/levels/${encodeURIComponent(levelId)}`,
    { headers: { "x-wallet-address": walletAddress }, cache: "no-store" }
  );

  if (response.status === 402) {
    const body = await response.json();
    return {
      kind: "payment-required",
      challenge: {
        courseId: body.courseId,
        levelId: body.levelId,
        amount: response.headers.get("x402-payment-amount") ?? body.amount,
        asset: response.headers.get("x402-payment-asset") ?? body.asset,
        usdcMint: response.headers.get("x402-usdc-mint") ?? body.usdcMint,
        creatorWallet: response.headers.get("x402-destination-wallet") ?? body.creatorWallet,
        treasuryWallet: response.headers.get("x402-platform-treasury-wallet") ?? body.treasuryWallet,
        creatorAmount: response.headers.get("x402-creator-amount") ?? body.creatorAmount,
        platformAmount: response.headers.get("x402-platform-amount") ?? body.platformAmount,
        platformFeeBps: Number(response.headers.get("x402-platform-fee-bps") ?? body.platformFeeBps)
      }
    };
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Unable to fetch level (${response.status})`);
  }
  return { kind: "content", content: await response.json() };
}

function toBaseUnits(amount: string): bigint {
  if (!/^\d+(\.\d{1,6})?$/.test(amount)) throw new Error("Invalid USDC amount in payment challenge");
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export async function payForLevelAndVerify(args: {
  connection: Connection;
  wallet: { publicKey: PublicKey | null; sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string> };
  challenge: X402Challenge;
}): Promise<string> {
  const { connection, wallet, challenge } = args;
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first");
  if (challenge.asset !== "USDC") throw new Error("Unsupported payment asset");
  if (challenge.creatorWallet === challenge.treasuryWallet) {
    throw new Error("Creator and platform treasury wallets must be different for split payments");
  }

  const payer = wallet.publicKey;
  const mint = new PublicKey(challenge.usdcMint);
  const creator = new PublicKey(challenge.creatorWallet);
  const treasury = new PublicKey(challenge.treasuryWallet);
  const sourceAta = getAssociatedTokenAddressSync(mint, payer, false, TOKEN_PROGRAM_ID);
  const creatorAta = getAssociatedTokenAddressSync(mint, creator, false, TOKEN_PROGRAM_ID);
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasury, false, TOKEN_PROGRAM_ID);
  const transaction = new Transaction();
  const memo = `questory:v1:${challenge.courseId}:${challenge.levelId}:${payer.toBase58()}:${mint.toBase58()}:${(toBaseUnits(challenge.creatorAmount) + toBaseUnits(challenge.platformAmount)).toString()}:${challenge.platformFeeBps}`;

  transaction.add(
    new TransactionInstruction({
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      keys: [],
      // data: new TextEncoder().encode(memo)
      data: Buffer.from(memo, "utf8")
    }),
    createAssociatedTokenAccountIdempotentInstruction(payer, creatorAta, creator, mint, TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountIdempotentInstruction(payer, treasuryAta, treasury, mint, TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(sourceAta, mint, creatorAta, payer, toBaseUnits(challenge.creatorAmount), 6, [], TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(sourceAta, mint, treasuryAta, payer, toBaseUnits(challenge.platformAmount), 6, [], TOKEN_PROGRAM_ID)
  );

  const signature = await wallet.sendTransaction(transaction, connection);
  const confirmation = await connection.confirmTransaction(signature, "confirmed");
  if (confirmation.value.err) throw new Error("USDC payment transaction failed on Solana");

  const verifyResponse = await fetch(`${baseUrl()}/api/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      courseId: challenge.courseId,
      levelId: challenge.levelId,
      walletAddress: payer.toBase58(),
      transactionSignature: signature
    })
  });
  const verification = await verifyResponse.json().catch(() => ({}));
  if (!verifyResponse.ok) throw new Error(verification.error ?? "Payment verification failed");
  return signature;
}
