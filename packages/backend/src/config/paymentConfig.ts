import { PublicKey } from "@solana/web3.js";

const DEFAULT_DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const BPS_DENOMINATOR = 10_000;

function readFeeBps(value: string | undefined): number {
  const parsed = Number(value ?? "500");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed >= BPS_DENOMINATOR) {
    throw new Error("QUESTORY_PLATFORM_FEE_BPS must be an integer from 1 to 9999");
  }
  return parsed;
}

function readPublicKey(value: string, name: string): string {
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error(`${name} must be a valid Solana public key`);
  }
}

export const paymentConfig = {
  platformFeeBps: readFeeBps(process.env.QUESTORY_PLATFORM_FEE_BPS),
  usdcMint: readPublicKey(process.env.QUESTORY_USDC_MINT ?? DEFAULT_DEVNET_USDC_MINT, "QUESTORY_USDC_MINT"),
  tokenDecimals: 6
};

export function splitAmount(amountUSDC: string, platformFeeBps = paymentConfig.platformFeeBps) {
  // Parse decimal strings exactly; USDC uses six decimal places.
  if (!/^\d+(\.\d{1,6})?$/.test(amountUSDC)) {
    throw new Error("Invalid USDC amount");
  }
  const [whole, fraction = ""] = amountUSDC.split(".");
  const total = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (total <= 0n) throw new Error("Payment amount must be positive");
  const platform = (total * BigInt(platformFeeBps)) / 10_000n;
  const creator = total - platform;
  if (creator <= 0n || platform <= 0n) {
    throw new Error("Payment amount is too small to split into creator and platform shares");
  }
  return {
    totalBaseUnits: total.toString(),
    creatorBaseUnits: creator.toString(),
    platformBaseUnits: platform.toString(),
    creatorAmount: formatUSDC(creator),
    platformAmount: formatUSDC(platform),
    feeBps: platformFeeBps
  };
}

function formatUSDC(value: bigint): string {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
