import { Router } from "express";
import { PublicKey, Connection } from "@solana/web3.js";
import { z } from "zod";
import type { CourseRepository } from "../services/courseRepository";
import type { EntitlementRepository } from "../services/entitlementRepository";
import { InMemoryPaymentSignatureRepository } from "../services/paymentSignatureRepository";
import { PaymentVerificationError, verifySplitPayment } from "../services/paymentVerifier";
import { paymentConfig, splitAmount } from "../config/paymentConfig";

const verifySchema = z.object({
  courseId: z.string().min(1).max(128),
  levelId: z.string().min(1).max(128),
  walletAddress: z.string().min(32).max(44),
  transactionSignature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{80,90}$/),
});

export function createPaymentRouter(deps: {
  courses: CourseRepository;
  entitlements: EntitlementRepository;
  signatures: InMemoryPaymentSignatureRepository;
  connection: Connection;
  treasuryWallet: string;
}) {
  const router = Router();

  router.post("/verify", async (req, res, next) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_PAYMENT_VERIFICATION_REQUEST" });
      return;
    }

    const { courseId, levelId, walletAddress, transactionSignature } = parsed.data;
    try {
      new PublicKey(walletAddress);
      new PublicKey(deps.treasuryWallet);
    } catch {
      res.status(400).json({ error: "INVALID_WALLET_ADDRESS" });
      return;
    }

    const found = await deps.courses.findLevel(courseId, levelId);
    if (!found) {
      res.status(404).json({ error: "LEVEL_NOT_FOUND" });
      return;
    }
    if (found.level.isFree) {
      res.status(400).json({ error: "LEVEL_DOES_NOT_REQUIRE_PAYMENT" });
      return;
    }
    if (await deps.entitlements.hasAccess(walletAddress, courseId, levelId)) {
      res.json({ status: "already-unlocked", courseId, levelId });
      return;
    }

    let split: ReturnType<typeof splitAmount>;
    try {
      split = splitAmount(found.level.x402CostUSDC ?? "0.02");
    } catch {
      res.status(500).json({ error: "PAYMENT_CONFIGURATION_ERROR" });
      return;
    }

    if (!deps.signatures.claim(transactionSignature)) {
      res.status(409).json({ error: "TRANSACTION_SIGNATURE_ALREADY_USED" });
      return;
    }

    try {
      await verifySplitPayment(deps.connection, {
        signature: transactionSignature,
        payerWallet: walletAddress,
        creatorWallet: found.course.creatorWallet,
        treasuryWallet: deps.treasuryWallet,
        mint: paymentConfig.usdcMint,
        creatorBaseUnits: split.creatorBaseUnits,
        platformBaseUnits: split.platformBaseUnits,
        memo: `questory:v1:${courseId}:${levelId}:${walletAddress}:${paymentConfig.usdcMint}:${split.totalBaseUnits}:${split.feeBps}`,
      });
      await deps.entitlements.grantAccess(walletAddress, courseId, levelId, transactionSignature);
      res.json({ status: "unlocked", courseId, levelId, transactionSignature });
    } catch (error) {
      deps.signatures.release(transactionSignature);
      if (error instanceof PaymentVerificationError) {
        const clientErrors = new Set([
          "TRANSACTION_NOT_CONFIRMED", "TRANSACTION_NOT_SUCCESSFUL", "PAYER_SIGNATURE_MISMATCH",
          "UNEXPECTED_TOKEN_TRANSFER", "INVALID_PAYMENT_TRANSFERS", "PAYMENT_AMOUNT_OR_RECIPIENT_MISMATCH",
          "UNPARSED_TOKEN_INSTRUCTION", "UNSAFE_UNCHECKED_TOKEN_TRANSFER", "PAYMENT_RESOURCE_MEMO_MISMATCH"
        ]);
        res.status(clientErrors.has(error.code) ? 400 : 500).json({ error: error.code });
        return;
      }
      next(error);
    }
  });

  return router;
}
