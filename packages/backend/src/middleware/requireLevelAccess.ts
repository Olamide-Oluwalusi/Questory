import type { NextFunction, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import type { CourseRepository } from "../services/courseRepository";
import type { EntitlementRepository } from "../services/entitlementRepository";

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

      if (await deps.entitlements.hasAccess(walletAddress, level.id)) {
        res.locals.course = course;
        res.locals.level = level;
        next();
        return;
      }

      const amount = level.x402CostUSDC ?? "0.02";
      let treasuryWallet: string;
      try {
        treasuryWallet = new PublicKey(deps.treasuryWallet).toBase58();
      } catch {
        res.status(500).json({ error: "PAYMENT_CONFIGURATION_ERROR" });
        return;
      }

      // The creator wallet is sourced from the course record, never from the request.
      res.setHeader("x402-payment-amount", amount);
      res.setHeader("x402-payment-asset", "USDC");
      res.setHeader("x402-destination-wallet", new PublicKey(course.creatorWallet).toBase58());
      res.setHeader("x402-platform-treasury-wallet", treasuryWallet);
      res.setHeader("access-control-expose-headers",
        "x402-payment-amount, x402-payment-asset, x402-destination-wallet, x402-platform-treasury-wallet");

      res.status(402).json({
        error: "PAYMENT_REQUIRED",
        courseId: course.id,
        levelId: level.id,
        amount,
        asset: "USDC",
        split: {
          creatorPercent: 85,
          platformPercent: 15,
          treasuryWallet
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
