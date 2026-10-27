import type { NextFunction, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import type { CourseRepository } from "../services/courseRepository";
import type { EntitlementRepository } from "../services/entitlementRepository";
import { paymentConfig, splitAmount } from "../config/paymentConfig";

export interface LevelAccessDependencies {
  courses: CourseRepository;
  entitlements: EntitlementRepository;
  treasuryWallet: string;
}

export interface LevelParams {
  courseId: string;
  levelId: string;
}

export function requireLevelAccess(deps: LevelAccessDependencies) {
  return async function levelAccessMiddleware(
    req: Request<LevelParams>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await deps.courses.findLevel(req.params.courseId, req.params.levelId);
      if (!result) {
        res.status(404).json({ error: "LEVEL_NOT_FOUND" });
        return;
      }

      const { course, level } = result;
      if (level.isFree) {
        res.locals.course = course;
        res.locals.level = level;
        next();
        return;
      }

      const walletAddress = req.header("x-wallet-address")?.trim();
      if (!walletAddress) {
        res.status(400).json({ error: "WALLET_ADDRESS_REQUIRED" });
        return;
      }
      try {
        new PublicKey(walletAddress);
      } catch {
        res.status(400).json({ error: "INVALID_WALLET_ADDRESS" });
        return;
      }

      if (await deps.entitlements.hasAccess(walletAddress, course.id, level.id)) {
        res.locals.course = course;
        res.locals.level = level;
        next();
        return;
      }

      let treasuryWallet: string;
      let creatorWallet: string;
      let split: ReturnType<typeof splitAmount>;
      try {
        treasuryWallet = new PublicKey(deps.treasuryWallet).toBase58();
        creatorWallet = new PublicKey(course.creatorWallet).toBase58();
        if (creatorWallet === treasuryWallet) throw new Error("Creator and treasury wallets must differ");
        split = splitAmount(level.x402CostUSDC ?? "0.02");
      } catch {
        res.status(500).json({ error: "PAYMENT_CONFIGURATION_ERROR" });
        return;
      }

      res.setHeader("x402-payment-amount", level.x402CostUSDC ?? "0.02");
      res.setHeader("x402-payment-asset", "USDC");
      res.setHeader("x402-usdc-mint", paymentConfig.usdcMint);
      res.setHeader("x402-destination-wallet", creatorWallet);
      res.setHeader("x402-platform-treasury-wallet", treasuryWallet);
      res.setHeader("x402-platform-fee-bps", String(paymentConfig.platformFeeBps));
      res.setHeader("x402-creator-amount", split.creatorAmount);
      res.setHeader("x402-platform-amount", split.platformAmount);
      res.setHeader("access-control-expose-headers", [
        "x402-payment-amount", "x402-payment-asset", "x402-usdc-mint",
        "x402-destination-wallet", "x402-platform-treasury-wallet",
        "x402-platform-fee-bps", "x402-creator-amount", "x402-platform-amount"
      ].join(", "));

      res.status(402).json({
        error: "PAYMENT_REQUIRED",
        courseId: course.id,
        levelId: level.id,
        amount: level.x402CostUSDC ?? "0.02",
        asset: "USDC",
        usdcMint: paymentConfig.usdcMint,
        creatorWallet,
        treasuryWallet,
        creatorAmount: split.creatorAmount,
        platformAmount: split.platformAmount,
        platformFeeBps: paymentConfig.platformFeeBps
      });
    } catch (error) {
      next(error);
    }
  };
}
