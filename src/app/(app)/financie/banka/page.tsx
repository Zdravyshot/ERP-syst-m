import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { bankConnectionStatusLabels } from "@/lib/zod-schemas";
import { tatraPremiumEnabled, tatraPremiumMissingConfig } from "@/lib/finance/banking/flags";
import { btnSecondary, card, cardHeader, table, thead, tr } from "@/components/ui";
import { SyncButton } from "./SyncButton";
import { StatementImport } from "./StatementImport";
import { parseStatementAction } from "./_actions";

const STATUS_COLORS: Record<string, "emerald" | "gray" | "yellow" | "red"> = {
  CONNECTED: "emerald",
  DISCONNECTED: "gray",
  REAUTH_REQUIRED: "yellow",
  ERROR: "red",
};

export default async function BankaPage() {
  const [connections, transactions, reviewCount] = await Promise.all([
    prisma.bankConnection.findMany({
      include: { accounts: { where: { isActive: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bankTransaction.findMany({
      orderBy: { bookingDate: "desc" },
      take: 50,
      include: {
        payment: {
          include: {
            allocations: {
              where: { reversedAt: null },
              include: { invoice: { select: { id: true, invoiceNumber: true } } },
            },
          },
        },
      },
    }),
    prisma.payment.count({
      where: {
        direction: "INCOMING",
        allocations: { none: { reversedAt: null } },
      },
    }),
  ]);

  const flagOn = tatraPremiumEnabled();
  const tatra = connections.find((c) => c.provider === "TATRA_PREMIUM");
  const statementConn = connections.find((c) => c.provider === "STATEMENT_IMPORT");

  return (
    <>
      <PageHeader title="Banka" subtitle="Tatra banka Premium API, import výpisov a bankové transakcie">
        <Link href="/financie/banka/parovanie" className="relative rounded-[10px] border border-stone-300 bg-white px-4 py-2 text-[13.5px] font-semibold text-stone-700 transition hover:bg-stone-50">
          Manuálna kontrola
          {reviewCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
              {reviewCount}
            </span>
          )}
        </Link>
        <Link href="/financie" className={btnSecondary}>
          ← Financie
        </Link>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-[14px] border border-stone-200 bg-white p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-stone-900">Tatra banka — Premium API</h2>
            {tatra ? (
              <Badge color={STATUS_COLORS[tatra.status] ?? "gray"}>
                {bankConnectionStatusLabels[tatra.status] ?? tatra.status}
              </Badge>
            ) : (
              <Badge color="gray">Nepripojené</Badge>
            )}
          </div>

          {!flagOn ? (
            <div className="text-sm text-stone-500">
              <p>
                Premium API čaká na aktiváciu v banke — beží dočasný import výpisov. Po aktivácii
                nastav v Railway variables:
              </p>
              <ul className="mt-2 list-inside list-disc text-xs text-stone-400">
                {tatraPremiumMissingConfig().map((v) => (
                  <li key={v}>
                    <code className="rounded bg-stone-100 px-1">{v}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <dl className="mb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Posledný sync</dt>
                  <dd className="font-medium text-stone-900">
                    {tatra?.lastSyncedAt ? formatDateTime(tatra.lastSyncedAt) : "—"}
                  </dd>
                </div>
                {tatra?.lastError && (
                  <div className="rounded-[10px] bg-red-50 px-3 py-2 text-xs text-red-700">{tatra.lastError}</div>
                )}
              </dl>
              <SyncButton disabled={!tatra} />
              {!tatra && (
                <p className="mt-2 text-xs text-stone-400">
                  Spojenie sa založí pri prvej autorizácii cez banku (consent flow po aktivácii API).
                </p>
              )}
              <p className="mt-3 text-xs text-stone-400">
                Automatický sync beží každých 15 minút cez Railway cron (POST /api/cron/bank-sync).
              </p>
            </>
          )}

          {(tatra?.accounts.length || statementConn?.accounts.length) ? (
            <div className="mt-4 border-t border-stone-100 pt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Účty</h3>
              <ul className="space-y-1 text-sm">
                {[...(tatra?.accounts ?? []), ...(statementConn?.accounts ?? [])].map((account) => (
                  <li key={account.id} className="flex justify-between">
                    <span className="text-stone-900">{account.name}</span>
                    <span className="tabular-nums text-stone-500">{account.iban}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <StatementImport parseAction={parseStatementAction} />
      </div>

      <div className={card}>
        <div className={cardHeader}>Bankové transakcie (posledných 50)</div>
        <div className="overflow-x-auto">
          <table className={table}>
            <thead>
              <tr className={thead}>
                <th className="px-[18px] py-[11px] font-medium">Dátum</th>
                <th className="px-[18px] py-[11px] text-right font-medium">Suma</th>
                <th className="px-[18px] py-[11px] font-medium">VS</th>
                <th className="px-[18px] py-[11px] font-medium">Protistrana</th>
                <th className="px-[18px] py-[11px] font-medium">Popis</th>
                <th className="px-[18px] py-[11px] font-medium">Párovanie</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => {
                const allocations = txn.payment?.allocations ?? [];
                return (
                  <tr key={txn.id} className={tr}>
                    <td className="whitespace-nowrap px-[18px] py-2.5 text-stone-500">
                      {formatDate(txn.bookingDate)}
                    </td>
                    <td
                      className={`px-[18px] py-2.5 text-right font-medium tabular-nums ${
                        txn.amountCents < 0 ? "text-[#B91C1C]" : "text-[#1F7A0F]"
                      }`}
                    >
                      {txn.amountCents > 0 ? "+" : ""}
                      {formatCents(txn.amountCents)}
                    </td>
                    <td className="px-[18px] py-2.5 tabular-nums text-stone-700">{txn.variableSymbol ?? "—"}</td>
                    <td className="px-[18px] py-2.5 text-stone-700">
                      {txn.counterpartyName ?? txn.counterpartyIban ?? "—"}
                    </td>
                    <td className="max-w-56 truncate px-[18px] py-2.5 text-stone-500">
                      {txn.remittanceInfo ?? "—"}
                    </td>
                    <td className="px-[18px] py-2.5">
                      {txn.amountCents < 0 ? (
                        <span className="text-xs text-stone-400">odchádzajúca</span>
                      ) : allocations.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {allocations.map((allocation) => (
                            <Link
                              key={allocation.id}
                              href={`/financie/faktury/${allocation.invoice.id}`}
                              className="rounded-full bg-[#E7F8E3] px-[9px] py-0.5 text-[11px] font-semibold text-[#1F7A0F] hover:underline"
                            >
                              {allocation.invoice.invoiceNumber ?? "koncept"}
                            </Link>
                          ))}
                        </span>
                      ) : (
                        <Link
                          href="/financie/banka/parovanie"
                          className="rounded-full bg-[#FFF6D2] px-[9px] py-0.5 text-[11px] font-semibold text-[#8A6200] hover:underline"
                        >
                          Na kontrolu
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr className={tr}>
                  <td colSpan={6} className="px-[18px] py-8 text-center text-stone-400">
                    Zatiaľ žiadne bankové transakcie — importujte výpis alebo spustite sync
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
