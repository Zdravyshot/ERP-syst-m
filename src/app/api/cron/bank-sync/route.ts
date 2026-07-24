import { NextResponse, type NextRequest } from "next/server";
import { runBankSync } from "@/lib/finance/banking/sync";
import { tatraPremiumEnabled } from "@/lib/finance/banking/flags";

/**
 * Railway cron: každých 15 minút POST na tento endpoint s hlavičkou
 * x-cron-secret (CRON_SECRET v Railway variables). Idempotentné — opakované
 * volanie neimportuje duplikáty (unikátnosť bankových transakcií).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "CRON_SECRET nie je nakonfigurovaný" }, { status: 503 });
  }
  if (request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Neplatný cron secret" }, { status: 401 });
  }

  if (!tatraPremiumEnabled()) {
    return NextResponse.json({ status: "skipped", reason: "Tatra Premium API je vypnuté (feature flag)." });
  }

  const summaries = await runBankSync();
  return NextResponse.json({ status: "done", connections: summaries });
}
