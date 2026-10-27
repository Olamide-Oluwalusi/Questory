/** Local-only replay guard. Use a durable database unique constraint before production. */
export class InMemoryPaymentSignatureRepository {
  private readonly claimed = new Set<string>();

  claim(signature: string): boolean {
    if (this.claimed.has(signature)) return false;
    this.claimed.add(signature);
    return true;
  }

  release(signature: string): void {
    this.claimed.delete(signature);
  }
}
