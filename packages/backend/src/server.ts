import "dotenv/config";
import express from "express";
import cors from "cors";
import { PublicKey } from "@solana/web3.js";
import { createCourseRouter } from "./routes/courseRoutes";
import creatorRoutes from "./routes/creatorRoutes";
import { MockCourseRepository } from "./services/courseRepository";
import { InMemoryEntitlementRepository } from "./services/entitlementRepository";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const treasuryWallet = process.env.QUESTORY_TREASURY_WALLET ?? "";

app.disable("x-powered-by");
app.use(cors({
  origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  exposedHeaders: [
    "x402-payment-amount",
    "x402-payment-asset",
    "x402-destination-wallet",
    "x402-platform-treasury-wallet"
  ]
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "questory-api" });
});

app.use("/api/creator", creatorRoutes);

const courses = new MockCourseRepository();
const entitlements = new InMemoryEntitlementRepository();

app.use("/api/courses", createCourseRouter(courses, entitlements, treasuryWallet));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Keep internal error details out of production responses.
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});

if (!treasuryWallet) {
  console.warn("QUESTORY_TREASURY_WALLET is not configured; paid-level challenges will return PAYMENT_CONFIGURATION_ERROR.");
} else {
  try {
    new PublicKey(treasuryWallet);
  } catch {
    console.warn("QUESTORY_TREASURY_WALLET is not a valid Solana public key.");
  }
}

app.listen(port, () => {
  console.log(`Questory API listening on http://localhost:${port}`);
});
