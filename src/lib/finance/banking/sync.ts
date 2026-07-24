import { prisma } from "@/lib/prisma";
import type { BankTransactionResult } from "@/lib/finance/contracts";
import { autoMatchPayment } from "@/lib/finance/matching/engine";
import { tatraPremiumEnabled } from "./flags";
import { decryptToken, encryptToken, TOKEN_KEY_VERSION } from "./tokenCrypto";
import { BankProviderError, TatraPremiumApiProvider } from "./tatraPremium";

/**
 * Sync vrstva: zápis bankových transakcií (idempotentne cez unikátnosť
 * [bankConnectionId, providerTransactionId]), tvorba Payment záznamov
 * a spustenie automatického párovania. Spúšťa sa z UI aj z Railway cronu
 * (POST /api/cron/bank-sync, každých 15 minút).
 */

export interface SyncSummary {
  connectionId: string;
  provider: string;
  imported: number;
  duplicates: number;
  autoMatched: number;
  manualReview: number;
  error?: string;
}

/** Zapíše stránku transakcií, vytvorí platby a spáruje ich. */
export async function persistTransactions(
  connectionId: string,
  transactions: BankTransactionResult[],
  paymentSource: "TATRA_PREMIUM" | "BANK_IMPORT",
): Promise<{ imported: number; duplicates: number; newPaymentIds: string[] }> {
  let imported = 0;
  let duplicates = 0;
  const newPaymentIds: string[] = [];

  for (const txn of transactions) {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findFirst({
        where: {
          bankConnectionId: connectionId,
          OR: [{ providerAccountId: txn.providerAccountId }, { iban: txn.providerAccountId }],
        },
        select: { id: true },
      });
      if (!account) {
        throw new Error(`Bankový účet pre providerAccountId ${txn.providerAccountId} neexistuje.`);
      }

      const existing = await tx.bankTransaction.findUnique({
        where: {
          bankConnectionId_providerTransactionId: {
            bankConnectionId: connectionId,
            providerTransactionId: txn.providerTransactionId,
          },
        },
        select: { id: true },
      });
      if (existing) return { created: false as const };

      const bankTransaction = await tx.bankTransaction.create({
        data: {
          bankConnectionId: connectionId,
          bankAccountId: account.id,
          providerTransactionId: txn.providerTransactionId,
          status: txn.status,
          bookingDate: txn.bookingDate,
          valueDate: txn.valueDate ?? null,
          amountCents: txn.amountCents,
          currency: txn.currency,
          counterpartyName: txn.counterpartyName ?? null,
          counterpartyIban: txn.counterpartyIban ?? null,
          variableSymbol: txn.variableSymbol ?? null,
          constantSymbol: txn.constantSymbol ?? null,
          specificSymbol: txn.specificSymbol ?? null,
          remittanceInfo: txn.remittanceInfo ?? null,
          rawPayload: txn.rawPayload === undefined ? undefined : JSON.parse(JSON.stringify(txn.rawPayload)),
        },
      });

      // Platba vzniká len pre zaúčtované transakcie; PENDING sa doplní pri ďalšom syncu.
      if (txn.status !== "BOOKED") return { created: true as const, paymentId: null };

      const payment = await tx.payment.create({
        data: {
          direction: txn.amountCents >= 0 ? "INCOMING" : "OUTGOING",
          source: paymentSource,
          amountCents: Math.abs(txn.amountCents),
          currency: txn.currency,
          paidAt: txn.valueDate ?? txn.bookingDate,
          reference: txn.remittanceInfo ?? null,
          variableSymbol: txn.variableSymbol ?? null,
          counterpartyName: txn.counterpartyName ?? null,
          counterpartyIban: txn.counterpartyIban ?? null,
          bankTransactionId: bankTransaction.id,
        },
      });
      return { created: true as const, paymentId: payment.id };
    });

    if (!result.created) duplicates += 1;
    else {
      imported += 1;
      if (result.paymentId) newPaymentIds.push(result.paymentId);
    }
  }

  return { imported, duplicates, newPaymentIds };
}

async function matchNewPayments(paymentIds: string[]): Promise<{ autoMatched: number; manualReview: number }> {
  let autoMatched = 0;
  let manualReview = 0;
  for (const paymentId of paymentIds) {
    const { outcome, skipped } = await autoMatchPayment(paymentId);
    if (outcome.type === "AUTO") autoMatched += 1;
    else if (outcome.type === "MANUAL" && !skipped) manualReview += 1;
  }
  return { autoMatched, manualReview };
}

function buildProvider(connection: {
  id: string;
  encryptedRefreshToken: string | null;
}): TatraPremiumApiProvider {
  return new TatraPremiumApiProvider({
    apiBase: process.env.TATRA_API_BASE ?? "",
    clientId: process.env.TATRA_CLIENT_ID ?? "",
    clientSecret: process.env.TATRA_CLIENT_SECRET ?? "",
    getRefreshToken: async () => {
      if (!connection.encryptedRefreshToken) {
        throw new BankProviderError("REAUTH_REQUIRED", "Spojenie nemá uložený refresh token.");
      }
      return decryptToken(connection.encryptedRefreshToken);
    },
    onRefreshTokenRotated: async (newToken, expiresAt) => {
      const encrypted = encryptToken(newToken);
      connection.encryptedRefreshToken = encrypted;
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: { encryptedRefreshToken: encrypted, tokenKeyVersion: TOKEN_KEY_VERSION, tokenExpiresAt: expiresAt },
      });
    },
  });
}

/** Sync jedného Tatra spojenia — stránkuje od uloženého kurzora. */
async function syncTatraConnection(connectionId: string): Promise<SyncSummary> {
  const connection = await prisma.bankConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const summary: SyncSummary = {
    connectionId,
    provider: "TATRA_PREMIUM",
    imported: 0,
    duplicates: 0,
    autoMatched: 0,
    manualReview: 0,
  };

  const provider = buildProvider(connection);
  let cursor = connection.syncCursor ?? undefined;

  try {
    // Účty sa pri každom syncu doplnia/aktualizujú
    const accounts = await provider.listAccounts();
    for (const account of accounts) {
      await prisma.bankAccount.upsert({
        where: { iban_currency: { iban: account.iban, currency: account.currency } },
        create: {
          bankConnectionId: connectionId,
          providerAccountId: account.providerAccountId,
          name: account.name,
          iban: account.iban,
          bic: account.bic ?? null,
          currency: account.currency,
        },
        update: { bankConnectionId: connectionId, providerAccountId: account.providerAccountId, name: account.name },
      });
    }

    let hasMore = true;
    while (hasMore) {
      const page = await provider.syncTransactions(cursor);
      const { imported, duplicates, newPaymentIds } = await persistTransactions(
        connectionId,
        page.transactions,
        "TATRA_PREMIUM",
      );
      summary.imported += imported;
      summary.duplicates += duplicates;
      const matched = await matchNewPayments(newPaymentIds);
      summary.autoMatched += matched.autoMatched;
      summary.manualReview += matched.manualReview;

      cursor = page.nextCursor;
      hasMore = page.hasMore && !!page.nextCursor;

      await prisma.bankConnection.update({
        where: { id: connectionId },
        data: { syncCursor: cursor ?? null, lastSyncedAt: new Date(), status: "CONNECTED", lastError: null },
      });
    }
    // Ďalší beh začne opäť od začiatku okna (kurzor sa po dobehnutí čistí);
    // deduplikáciu zaručuje unikátnosť transakcií.
    await prisma.bankConnection.update({ where: { id: connectionId }, data: { syncCursor: null } });
  } catch (e) {
    const kind = e instanceof BankProviderError ? e.kind : "OUTAGE";
    const message = e instanceof Error ? e.message : String(e);
    summary.error = message;
    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: { status: kind === "REAUTH_REQUIRED" ? "REAUTH_REQUIRED" : "ERROR", lastError: message },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "BANK_SYNC",
      entityType: "BankConnection",
      entityId: connectionId,
      metadata: JSON.parse(JSON.stringify(summary)),
    },
  });

  return summary;
}

/** Vstupný bod pre cron aj UI tlačidlo „Synchronizovať teraz". */
export async function runBankSync(): Promise<SyncSummary[]> {
  if (!tatraPremiumEnabled()) return [];

  const connections = await prisma.bankConnection.findMany({
    where: { provider: "TATRA_PREMIUM", status: { in: ["CONNECTED", "ERROR"] } },
    select: { id: true },
  });

  const summaries: SyncSummary[] = [];
  for (const connection of connections) {
    summaries.push(await syncTatraConnection(connection.id));
  }
  return summaries;
}

/** Dočasný import výpisu: nájde/založí STATEMENT_IMPORT spojenie a účet. */
export async function importStatementTransactions(
  iban: string,
  transactions: BankTransactionResult[],
): Promise<SyncSummary> {
  const normalizedIban = iban.replace(/\s/g, "").toUpperCase();

  const connection =
    (await prisma.bankConnection.findFirst({ where: { provider: "STATEMENT_IMPORT" } })) ??
    (await prisma.bankConnection.create({
      data: { provider: "STATEMENT_IMPORT", status: "CONNECTED" },
    }));

  await prisma.bankAccount.upsert({
    where: { iban_currency: { iban: normalizedIban, currency: "EUR" } },
    create: {
      bankConnectionId: connection.id,
      providerAccountId: normalizedIban,
      name: `Účet ${normalizedIban.slice(-4)}`,
      iban: normalizedIban,
      currency: "EUR",
    },
    update: { bankConnectionId: connection.id, providerAccountId: normalizedIban },
  });

  const withAccount = transactions.map((t) => ({ ...t, providerAccountId: normalizedIban }));
  const { imported, duplicates, newPaymentIds } = await persistTransactions(
    connection.id,
    withAccount,
    "BANK_IMPORT",
  );
  const matched = await matchNewPayments(newPaymentIds);

  const summary: SyncSummary = {
    connectionId: connection.id,
    provider: "STATEMENT_IMPORT",
    imported,
    duplicates,
    ...matched,
  };

  await prisma.bankConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date(), lastError: null },
  });
  await prisma.auditLog.create({
    data: {
      action: "BANK_STATEMENT_IMPORT",
      entityType: "BankConnection",
      entityId: connection.id,
      metadata: JSON.parse(JSON.stringify(summary)),
    },
  });

  return summary;
}
