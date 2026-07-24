/**
 * Feature flag Tatra Premium API — kým neprebehne aktivácia v banke,
 * provider je vypnutý a banka beží len na dočasnom importe výpisov.
 * Tajomstvá (client id/secret, kľúč na šifrovanie tokenov) žijú výhradne
 * v Railway variables / .env — nikdy v kóde ani v databáze.
 */

export function tatraPremiumEnabled(): boolean {
  return (
    process.env.TATRA_PREMIUM_ENABLED === "1" &&
    !!process.env.TATRA_API_BASE &&
    !!process.env.TATRA_CLIENT_ID &&
    !!process.env.TATRA_CLIENT_SECRET &&
    /^[0-9a-fA-F]{64}$/.test(process.env.BANK_TOKEN_KEY ?? "")
  );
}

export function tatraPremiumMissingConfig(): string[] {
  const missing: string[] = [];
  if (process.env.TATRA_PREMIUM_ENABLED !== "1") missing.push("TATRA_PREMIUM_ENABLED=1");
  if (!process.env.TATRA_API_BASE) missing.push("TATRA_API_BASE");
  if (!process.env.TATRA_CLIENT_ID) missing.push("TATRA_CLIENT_ID");
  if (!process.env.TATRA_CLIENT_SECRET) missing.push("TATRA_CLIENT_SECRET");
  if (!/^[0-9a-fA-F]{64}$/.test(process.env.BANK_TOKEN_KEY ?? "")) {
    missing.push("BANK_TOKEN_KEY (64 hex znakov)");
  }
  return missing;
}
