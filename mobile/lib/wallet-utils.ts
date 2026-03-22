/**
 * Detect wallet cancellation/rejection errors across all wallet adapters.
 * Covers: Phantom, Solflare, MWA, and generic adapter cancellations.
 */
export function isWalletCancellation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg === 'WALLET_CANCELLED' ||
    /User rejected|cancelled|Cancelled|CancellationException|user rejected|ACTION_CANCELLED/i.test(msg)
  );
}
