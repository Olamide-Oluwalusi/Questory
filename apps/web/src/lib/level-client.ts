export type X402Challenge = {
  amount: string;
  asset: string;
  destinationWallet: string;
};

export async function fetchLevel(courseId: string, levelId: string, walletAddress: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const response = await fetch(
    `${baseUrl}/api/courses/${encodeURIComponent(courseId)}/levels/${encodeURIComponent(levelId)}`,
    {
      headers: { "x-wallet-address": walletAddress },
      cache: "no-store"
    }
  );

  if (response.status === 402) {
    const challenge: X402Challenge = {
      amount: response.headers.get("x402-payment-amount") ?? "",
      asset: response.headers.get("x402-payment-asset") ?? "",
      destinationWallet: response.headers.get("x402-destination-wallet") ?? ""
    };

    // UI/payment orchestration will handle the wallet transaction in a later task.
    // Do not automatically submit a transaction until the server challenge and
    // expected split amounts have been validated by the client.
    return { kind: "payment-required" as const, challenge };
  }

  if (!response.ok) {
    throw new Error(`Unable to fetch level (${response.status})`);
  }

  return { kind: "content" as const, content: await response.json() };
}
