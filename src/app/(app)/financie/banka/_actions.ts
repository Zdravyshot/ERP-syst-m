"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { importStatementTransactions, runBankSync } from "@/lib/finance/banking/sync";
import { tatraPremiumEnabled } from "@/lib/finance/banking/flags";
import { parseStatementCsv } from "@/lib/finance/banking/statement";
import { allocatePayment, reverseAllocation } from "@/lib/finance/matching/engine";

export interface BankFormState {
  error?: string;
  success?: string;
}

/** Ručné spustenie synchronizácie z UI (rovnaká cesta ako cron). */
export async function triggerBankSync(_prev: BankFormState, _formData: FormData): Promise<BankFormState> {
  await requireUser();
  if (!tatraPremiumEnabled()) {
    return { error: "Tatra Premium API je vypnuté — chýba aktivácia/feature flag." };
  }
  const summaries = await runBankSync();
  revalidatePath("/financie/banka");
  revalidatePath("/financie/banka/parovanie");
  if (summaries.length === 0) return { success: "Žiadne aktívne bankové spojenie." };
  const total = summaries.reduce(
    (acc, s) => ({
      imported: acc.imported + s.imported,
      autoMatched: acc.autoMatched + s.autoMatched,
      manualReview: acc.manualReview + s.manualReview,
    }),
    { imported: 0, autoMatched: 0, manualReview: 0 },
  );
  const failed = summaries.filter((s) => s.error);
  const base = `Nové transakcie: ${total.imported} · spárované: ${total.autoMatched} · na kontrolu: ${total.manualReview}`;
  return failed.length > 0 ? { error: `${base} · chyby: ${failed.map((f) => f.error).join("; ")}` } : { success: base };
}

/** Parsovanie výpisu beží na serveri (node:crypto pre deterministické ID). */
export async function parseStatementAction(
  text: string,
  iban: string,
): Promise<
  | {
      transactions: Array<{
        providerTransactionId: string;
        providerAccountId: string;
        status: "PENDING" | "BOOKED";
        bookingDate: string;
        valueDate?: string;
        amountCents: number;
        currency: "EUR";
        counterpartyName?: string;
        counterpartyIban?: string;
        variableSymbol?: string;
        constantSymbol?: string;
        specificSymbol?: string;
        remittanceInfo?: string;
      }>;
      skippedLines: number;
    }
  | { error: string }
> {
  await requireUser();
  try {
    const result = parseStatementCsv(text, iban.replace(/\s/g, "").toUpperCase());
    return {
      transactions: result.transactions.map((t) => ({
        ...t,
        currency: "EUR" as const,
        bookingDate: t.bookingDate.toISOString(),
        valueDate: t.valueDate?.toISOString(),
        rawPayload: undefined,
      })),
      skippedLines: result.skippedLines,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Výpis sa nepodarilo spracovať." };
  }
}

const statementRowSchema = z.object({
  providerTransactionId: z.string().min(1),
  providerAccountId: z.string().min(1),
  status: z.enum(["PENDING", "BOOKED"]),
  bookingDate: z.string().min(1),
  valueDate: z.string().optional(),
  amountCents: z.number().int(),
  currency: z.literal("EUR"),
  counterpartyName: z.string().optional(),
  counterpartyIban: z.string().optional(),
  variableSymbol: z.string().optional(),
  constantSymbol: z.string().optional(),
  specificSymbol: z.string().optional(),
  remittanceInfo: z.string().optional(),
});

/** Dočasný import bankového výpisu — riadky parsuje klient (preview), zapisuje server. */
export async function importStatement(_prev: BankFormState, formData: FormData): Promise<BankFormState> {
  await requireUser();

  const iban = String(formData.get("iban") ?? "").replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return { error: "Zadajte platný IBAN účtu, ku ktorému výpis patrí." };
  }

  let rowsRaw: unknown;
  try {
    rowsRaw = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { error: "Neplatné dáta výpisu." };
  }
  const rows = z.array(statementRowSchema).max(2000, "Naraz možno importovať max 2000 transakcií.").safeParse(rowsRaw);
  if (!rows.success) return { error: rows.error.issues[0]?.message ?? "Neplatné riadky výpisu." };
  if (rows.data.length === 0) return { error: "Výpis neobsahuje žiadne transakcie." };

  const summary = await importStatementTransactions(
    iban,
    rows.data.map((row) => ({
      ...row,
      bookingDate: new Date(row.bookingDate),
      valueDate: row.valueDate ? new Date(row.valueDate) : undefined,
    })),
  );

  revalidatePath("/financie/banka");
  revalidatePath("/financie/banka/parovanie");
  revalidatePath("/financie/cashflow");
  return {
    success: `Import hotový — nové: ${summary.imported}, duplikáty: ${summary.duplicates}, spárované: ${summary.autoMatched}, na kontrolu: ${summary.manualReview}.`,
  };
}

/** Manuálna alokácia platby na faktúru (aj čiastočná). */
export async function allocatePaymentAction(_prev: BankFormState, formData: FormData): Promise<BankFormState> {
  const user = await requireUser();

  const paymentId = String(formData.get("paymentId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").replace(/\s/g, "").replace(",", ".");
  const amountCents = Math.round(Number.parseFloat(amountRaw) * 100);

  if (!paymentId || !invoiceId) return { error: "Vyberte platbu aj faktúru." };
  if (Number.isNaN(amountCents) || amountCents <= 0) return { error: "Zadajte platnú kladnú sumu." };

  try {
    await allocatePayment(paymentId, invoiceId, amountCents, user.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Alokácia zlyhala." };
  }

  revalidatePath("/financie/banka");
  revalidatePath("/financie/banka/parovanie");
  revalidatePath("/financie/faktury");
  revalidatePath("/financie/cashflow");
  return { success: "Platba bola priradená k faktúre." };
}

export async function reverseAllocationAction(_prev: BankFormState, formData: FormData): Promise<BankFormState> {
  const user = await requireUser();
  const allocationId = String(formData.get("allocationId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || "Manuálne zrušenie";

  try {
    await reverseAllocation(allocationId, user.userId, reason);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Zrušenie alokácie zlyhalo." };
  }

  revalidatePath("/financie/banka/parovanie");
  revalidatePath("/financie/faktury");
  return { success: "Alokácia bola zrušená." };
}
