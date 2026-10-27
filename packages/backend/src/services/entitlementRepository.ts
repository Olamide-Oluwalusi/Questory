export interface EntitlementRepository {
  hasAccess(walletAddress: string, courseId: string, levelId: string): Promise<boolean>;
  grantAccess(walletAddress: string, courseId: string, levelId: string, transactionSignature: string): Promise<void>;
}

/** Local-only implementation. Replace with a durable table and unique constraints before production. */
export class InMemoryEntitlementRepository implements EntitlementRepository {
  private readonly entitlements = new Map<string, string>();

  async hasAccess(walletAddress: string, courseId: string, levelId: string): Promise<boolean> {
    return this.entitlements.has(this.key(walletAddress, courseId, levelId));
  }

  async grantAccess(walletAddress: string, courseId: string, levelId: string, transactionSignature: string): Promise<void> {
    this.entitlements.set(this.key(walletAddress, courseId, levelId), transactionSignature);
  }

  private key(walletAddress: string, courseId: string, levelId: string): string {
    return `${walletAddress.toLowerCase()}:${courseId}:${levelId}`;
  }
}
