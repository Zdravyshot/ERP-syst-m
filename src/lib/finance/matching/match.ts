/**
 * Čistá klasifikácia párovania platby na faktúru — bez databázy, plne
 * testovateľná. Poradie podľa docs/FINANCE_V2_IMPLEMENTATION_PLAN.md §4C:
 *
 *   1. presný variabilný symbol + suma + mena,
 *   2. jednoznačný IBAN + suma + tolerancia dátumu,
 *   3. inak manuálna kontrola.
 *
 * Čiastočné, nadmerné a nejednoznačné úhrady sa NIKDY nepárujú automaticky.
 */

export interface PaymentCandidate {
  amountCents: number; // kladná suma úhrady
  currency: string;
  paidAt: Date;
  variableSymbol?: string | null;
  counterpartyIban?: string | null;
}

export interface InvoiceCandidate {
  invoiceId: string;
  variableSymbol?: string | null;
  clientIban?: string | null;
  outstandingCents: number; // zostáva uhradiť (totalGross − aktívne alokácie)
  currency: string;
  dueDate: Date;
}

export type MatchOutcome =
  | { type: "AUTO"; rule: "EXACT_VS" | "UNIQUE_IBAN"; invoiceId: string }
  | { type: "MANUAL"; reason: string; candidateInvoiceIds: string[] };

export const IBAN_DATE_TOLERANCE_DAYS = 14;

export function normalizeVs(vs: string | null | undefined): string | null {
  if (!vs) return null;
  const digits = vs.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length > 0 ? digits : null;
}

export function normalizeIban(iban: string | null | undefined): string | null {
  if (!iban) return null;
  const cleaned = iban.replace(/\s/g, "").toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (24 * 3600 * 1000);
}

export function classifyPayment(
  payment: PaymentCandidate,
  invoices: InvoiceCandidate[],
): MatchOutcome {
  const open = invoices.filter((inv) => inv.outstandingCents > 0 && inv.currency === payment.currency);
  if (open.length === 0) {
    return { type: "MANUAL", reason: "Žiadna otvorená faktúra v danej mene.", candidateInvoiceIds: [] };
  }

  // Pravidlo 1 — presný VS + presná suma + mena
  const paymentVs = normalizeVs(payment.variableSymbol);
  if (paymentVs) {
    const vsMatches = open.filter((inv) => normalizeVs(inv.variableSymbol) === paymentVs);
    if (vsMatches.length === 1) {
      const invoice = vsMatches[0];
      if (invoice.outstandingCents === payment.amountCents) {
        return { type: "AUTO", rule: "EXACT_VS", invoiceId: invoice.invoiceId };
      }
      return {
        type: "MANUAL",
        reason:
          payment.amountCents < invoice.outstandingCents
            ? "Čiastočná úhrada — suma je nižšia ako zostatok faktúry."
            : "Nadmerná úhrada — suma prevyšuje zostatok faktúry.",
        candidateInvoiceIds: [invoice.invoiceId],
      };
    }
    if (vsMatches.length > 1) {
      const exactAmount = vsMatches.filter((inv) => inv.outstandingCents === payment.amountCents);
      if (exactAmount.length === 1) {
        return { type: "AUTO", rule: "EXACT_VS", invoiceId: exactAmount[0].invoiceId };
      }
      return {
        type: "MANUAL",
        reason: "Nejednoznačný variabilný symbol — viac otvorených faktúr.",
        candidateInvoiceIds: vsMatches.map((inv) => inv.invoiceId),
      };
    }
  }

  // Pravidlo 2 — jednoznačný IBAN + presná suma + tolerancia dátumu
  const paymentIban = normalizeIban(payment.counterpartyIban);
  if (paymentIban) {
    const ibanMatches = open.filter(
      (inv) =>
        normalizeIban(inv.clientIban) === paymentIban &&
        inv.outstandingCents === payment.amountCents &&
        daysBetween(payment.paidAt, inv.dueDate) <= IBAN_DATE_TOLERANCE_DAYS,
    );
    if (ibanMatches.length === 1) {
      return { type: "AUTO", rule: "UNIQUE_IBAN", invoiceId: ibanMatches[0].invoiceId };
    }
    if (ibanMatches.length > 1) {
      return {
        type: "MANUAL",
        reason: "Viac faktúr rovnakej sumy pre daný IBAN — vyžaduje kontrolu.",
        candidateInvoiceIds: ibanMatches.map((inv) => inv.invoiceId),
      };
    }
  }

  // Pravidlo 3 — manuálna kontrola s návrhom kandidátov (rovnaká suma alebo VS)
  const suggested = open
    .filter(
      (inv) =>
        inv.outstandingCents === payment.amountCents ||
        (paymentVs !== null && normalizeVs(inv.variableSymbol) === paymentVs),
    )
    .map((inv) => inv.invoiceId);

  return {
    type: "MANUAL",
    reason: "Platbu sa nepodarilo jednoznačne priradiť.",
    candidateInvoiceIds: suggested,
  };
}
