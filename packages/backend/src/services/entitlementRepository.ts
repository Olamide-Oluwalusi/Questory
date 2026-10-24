export interface EntitlementRepository {
  hasAccess(walletAddress: string, levelId: string): Promise<boolean>;
  grantAccess(walletAddress: string, levelId: string, transactionSignature: string): Promise<void>;
}

/**
 * Local-only implementation. Replace with a durable database table and a unique
 * constraint on (wallet_address, level_id) before production.
 */
export class InMemoryEntitlementRepository implements EntitlementRepository {
  private readonly entitlements = new Map<string, string>();

  async hasAccess(walletAddress: string, levelId: string): Promise<boolean> {
    return this.entitlements.has(this.key(walletAddress, levelId));
  }

  async grantAccess(walletAddress: string, levelId: string, transactionSignature: string): Promise<void> {
    this.entitlements.set(this.key(walletAddress, levelId), transactionSignature);
  }

  private key(walletAddress: string, levelId: string): string {
    return `${walletAddress.toLowerCase()}:${levelId}`;
  }
}
