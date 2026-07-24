import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classifyPayment, type InvoiceCandidate, type MatchOutcome } from "./match";

type Tx = Prisma.TransactionClient;

/**
 * DB vrstva párovania: alokácie platieb, prepočet paymentStatus a audit.
 * paymentStatus sa NIKDY nenastavuje ručne — vždy sa počíta zo súčtu
 * aktívnych alokácií (docs/FINANCE_V2_IMPLEMENTATION_PLAN.md §3.1).
 */

export async function invoiceOutstandingCents(tx: Tx, invoiceId: string): Promise<number> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { totalGrossCents: true },
  });
  const allocated = await tx.paymentAllocation.aggregate({
    where: { invoiceId, reversedAt: null },
    _sum: { amountCents: true },
  });
  return invoice.totalGrossCents - (allocated._sum.amountCents ?? 0);
}

export async function recomputePaymentStatus(tx: Tx, invoiceId: string): Promise<string> {
  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { totalGrossCents: true },
  });
  const allocated = await tx.paymentAllocation.aggregate({
    where: { invoiceId, reversedAt: null },
    _sum: { amountCents: true },
  });
  const sum = allocated._sum.amountCents ?? 0;
  const paymentStatus =
    sum === 0
      ? "UNPAID"
      : sum < invoice.totalGrossCents
        ? "PARTIALLY_PAID"
        : sum === invoice.totalGrossCents
          ? "PAID"
          : "OVERPAID";

  // Legacy pole `status` drží UI v1 v synchróne, kým ho A1 nenahradí.
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { status: paymentStatus === "PAID" ? "UHRADENA" : "VYSTAVENA" },
  });
  return paymentStatus;
}

async function audit(
  tx: Tx,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Prisma.InputJsonValue,
  actorId?: string | null,
) {
  await tx.auditLog.create({
    data: { action, entityType, entityId, metadata, actorId: actorId ?? null },
  });
}

export async function paymentUnallocatedCents(tx: Tx, paymentId: string): Promise<number> {
  const payment = await tx.payment.findUniqueOrThrow({
    where: { id: paymentId },
    select: { amountCents: true },
  });
  const allocated = await tx.paymentAllocation.aggregate({
    where: { paymentId, reversedAt: null },
    _sum: { amountCents: true },
  });
  return Math.abs(payment.amountCents) - (allocated._sum.amountCents ?? 0);
}

/**
 * Kandidátske faktúry pre prichádzajúcu platbu: vydané, finalizované, neuhradené.
 * Legacy stav UHRADENA (historické úhrady bez alokácií, pred v2 backfillom v A1)
 * sa rešpektuje — takéto faktúry nie sú kandidátmi na párovanie.
 */
async function openInvoiceCandidates(tx: Tx): Promise<InvoiceCandidate[]> {
  const invoices = await tx.invoice.findMany({
    where: {
      direction: "VYDANA",
      documentType: "INVOICE",
      documentStatus: { not: "CANCELLED" },
      status: { notIn: ["STORNO", "UHRADENA"] },
    },
    select: {
      id: true,
      variableSymbol: true,
      currency: true,
      dueDate: true,
      totalGrossCents: true,
      client: { select: { id: true } },
      paymentAllocations: {
        where: { reversedAt: null },
        select: { amountCents: true },
      },
    },
  });

  return invoices
    .map((inv) => ({
      invoiceId: inv.id,
      variableSymbol: inv.variableSymbol,
      clientIban: null as string | null, // IBAN klienta doplní A1 v Client modeli; pravidlo 2 zatiaľ z snapshotov nižšie
      outstandingCents:
        inv.totalGrossCents - inv.paymentAllocations.reduce((sum, a) => sum + a.amountCents, 0),
      currency: inv.currency,
      dueDate: inv.dueDate,
    }))
    .filter((inv) => inv.outstandingCents > 0);
}

export interface AutoMatchResult {
  paymentId: string;
  outcome: MatchOutcome;
  /** true = platba sa párovania netýka (odchádzajúca / už alokovaná) */
  skipped?: boolean;
}

/**
 * Automatické párovanie jednej platby. Alokácia vznikne LEN pri plnej,
 * jednoznačnej zhode — čiastočné/nadmerné/nejednoznačné ostávajú na
 * manuálnu kontrolu (/financie/banka/parovanie).
 */
export async function autoMatchPayment(paymentId: string): Promise<AutoMatchResult> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });

    const unallocated = await paymentUnallocatedCents(tx, paymentId);
    if (payment.direction !== "INCOMING" || unallocated <= 0) {
      return {
        paymentId,
        outcome: { type: "MANUAL", reason: "Platba už je alokovaná alebo je odchádzajúca.", candidateInvoiceIds: [] },
        skipped: true,
      } satisfies AutoMatchResult;
    }

    const outcome = classifyPayment(
      {
        amountCents: unallocated,
        currency: payment.currency,
        paidAt: payment.paidAt,
        variableSymbol: payment.variableSymbol,
        counterpartyIban: payment.counterpartyIban,
      },
      await openInvoiceCandidates(tx),
    );

    if (outcome.type === "AUTO") {
      await tx.paymentAllocation.create({
        data: {
          paymentId,
          invoiceId: outcome.invoiceId,
          amountCents: unallocated,
        },
      });
      await recomputePaymentStatus(tx, outcome.invoiceId);
      await audit(tx, "PAYMENT_AUTO_MATCHED", "Payment", paymentId, {
        rule: outcome.rule,
        invoiceId: outcome.invoiceId,
        amountCents: unallocated,
      });
    }

    return { paymentId, outcome };
  });
}

/** Manuálna alokácia (aj čiastočná) z obrazovky kontroly. */
export async function allocatePayment(
  paymentId: string,
  invoiceId: string,
  amountCents: number,
  actorId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (amountCents <= 0) throw new Error("Alokovaná suma musí byť kladná.");

    const unallocated = await paymentUnallocatedCents(tx, paymentId);
    if (amountCents > unallocated) {
      throw new Error(
        `Alokácia prevyšuje nealokovaný zostatok platby (${(unallocated / 100).toFixed(2)} €).`,
      );
    }

    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: { documentStatus: true, direction: true },
    });
    if (invoice.documentStatus === "CANCELLED") throw new Error("Faktúra je stornovaná.");
    if (invoice.direction !== "VYDANA") throw new Error("Alokovať možno len na vydané faktúry.");

    const existing = await tx.paymentAllocation.findUnique({
      where: { paymentId_invoiceId: { paymentId, invoiceId } },
    });
    if (existing && existing.reversedAt === null) {
      throw new Error("Platba už má aktívnu alokáciu na túto faktúru.");
    }
    if (existing) {
      await tx.paymentAllocation.update({
        where: { id: existing.id },
        data: { amountCents, reversedAt: null, reversedById: null, reverseReason: null, createdById: actorId },
      });
    } else {
      await tx.paymentAllocation.create({
        data: { paymentId, invoiceId, amountCents, createdById: actorId },
      });
    }

    await recomputePaymentStatus(tx, invoiceId);
    await audit(
      tx,
      "PAYMENT_MANUALLY_ALLOCATED",
      "Payment",
      paymentId,
      { invoiceId, amountCents },
      actorId,
    );
  });
}

/** Zrušenie alokácie — alokácia sa nemaže, označí sa reversedAt (audit trail). */
export async function reverseAllocation(
  allocationId: string,
  actorId: string,
  reason: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const allocation = await tx.paymentAllocation.findUniqueOrThrow({ where: { id: allocationId } });
    if (allocation.reversedAt !== null) throw new Error("Alokácia už bola zrušená.");

    await tx.paymentAllocation.update({
      where: { id: allocationId },
      data: { reversedAt: new Date(), reversedById: actorId, reverseReason: reason },
    });
    await recomputePaymentStatus(tx, allocation.invoiceId);
    await audit(
      tx,
      "PAYMENT_ALLOCATION_REVERSED",
      "PaymentAllocation",
      allocationId,
      { invoiceId: allocation.invoiceId, reason },
      actorId,
    );
  });
}
