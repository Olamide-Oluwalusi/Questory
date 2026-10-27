import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export interface ExpectedPayment {
  signature: string;
  payerWallet: string;
  creatorWallet: string;
  treasuryWallet: string;
  mint: string;
  creatorBaseUnits: string;
  platformBaseUnits: string;
  memo: string;
}

export class PaymentVerificationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export async function verifySplitPayment(connection: Connection, expected: ExpectedPayment): Promise<void> {
  const payer = new PublicKey(expected.payerWallet);
  const creator = new PublicKey(expected.creatorWallet);
  const treasury = new PublicKey(expected.treasuryWallet);
  const mint = new PublicKey(expected.mint);

  const status = await connection.getSignatureStatus(expected.signature, { searchTransactionHistory: true });
  if (!status.value || status.value.err || !["confirmed", "finalized"].includes(status.value.confirmationStatus ?? "")) {
    throw new PaymentVerificationError("TRANSACTION_NOT_CONFIRMED");
  }

  const parsed = await connection.getParsedTransaction(expected.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0
  });
  if (!parsed || parsed.meta?.err) throw new PaymentVerificationError("TRANSACTION_NOT_SUCCESSFUL");

  const payerIsSigner = parsed.transaction.message.accountKeys.some(
    (key) => key.pubkey.equals(payer) && key.signer
  );
  if (!payerIsSigner) throw new PaymentVerificationError("PAYER_SIGNATURE_MISMATCH");

  const payerAta = getAssociatedTokenAddressSync(mint, payer, false, TOKEN_PROGRAM_ID);
  const creatorAta = getAssociatedTokenAddressSync(mint, creator, false, TOKEN_PROGRAM_ID);
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasury, false, TOKEN_PROGRAM_ID);
  const found = new Map<string, string>();
  let transferCount = 0;
  let memoFound = false;

  for (const instruction of parsed.transaction.message.instructions) {
    if (instruction.programId.equals(MEMO_PROGRAM_ID)) {
      const memoInstruction = instruction as { parsed?: unknown; info?: { memo?: unknown } };
      if ((typeof memoInstruction.parsed === "string" && memoInstruction.parsed === expected.memo) ||
          (typeof memoInstruction.info?.memo === "string" && memoInstruction.info.memo === expected.memo)) memoFound = true;
      continue;
    }
    if (!instruction.programId.equals(TOKEN_PROGRAM_ID)) continue;
    if (!("parsed" in instruction)) throw new PaymentVerificationError("UNPARSED_TOKEN_INSTRUCTION");
    const parsedInstruction = instruction.parsed as {
      type?: string;
      info?: { authority?: string; mint?: string; source?: string; destination?: string; tokenAmount?: { amount?: string } };
    };
    if (parsedInstruction.type === "transfer") throw new PaymentVerificationError("UNSAFE_UNCHECKED_TOKEN_TRANSFER");
    if (parsedInstruction.type !== "transferChecked") continue;
    transferCount++;
    const info = parsedInstruction.info;
    if (!info || info.authority !== payer.toBase58() || info.mint !== mint.toBase58() || info.source !== payerAta.toBase58()) {
      throw new PaymentVerificationError("UNEXPECTED_TOKEN_TRANSFER");
    }
    const destination = info.destination;
    const amount = info.tokenAmount?.amount;
    if (!destination || !amount || found.has(destination)) {
      throw new PaymentVerificationError("INVALID_PAYMENT_TRANSFERS");
    }
    found.set(destination, amount);
  }

  if (!memoFound) throw new PaymentVerificationError("PAYMENT_RESOURCE_MEMO_MISMATCH");
  if (transferCount !== 2 || found.get(creatorAta.toBase58()) !== expected.creatorBaseUnits ||
      found.get(treasuryAta.toBase58()) !== expected.platformBaseUnits) {
    throw new PaymentVerificationError("PAYMENT_AMOUNT_OR_RECIPIENT_MISMATCH");
  }
}
