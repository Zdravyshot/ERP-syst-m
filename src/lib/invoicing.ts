import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type Tx = Prisma.TransactionClient;

/**
 * Transakčne bezpečné číslovanie dokladov.
 * counterId napr. "VYDANA-2026" → "FA2026001", "PRIJATA-2026" → "PF2026001",
 * "OBJ-2026" → "OBJ2026-0001", "SARZA-2026" → "S2026-0001".
 * VŽDY volať vnútri prisma.$transaction — inak hrozia duplikáty.
 */
export async function nextNumber(tx: Tx, kind: "VYDANA" | "PRIJATA" | "OBJ" | "SARZA", year: number): Promise<string> {
  const counterId = `${kind}-${year}`;
  const counter = await tx.docCounter.upsert({
    where: { id: counterId },
    create: { id: counterId, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  const n = counter.lastNumber;
  switch (kind) {
    case "VYDANA":
      return `FA${year}${String(n).padStart(3, "0")}`;
    case "PRIJATA":
      return `PF${year}${String(n).padStart(3, "0")}`;
    case "OBJ":
      return `OBJ${year}-${String(n).padStart(4, "0")}`;
    case "SARZA":
      return `S${year}-${String(n).padStart(4, "0")}`;
  }
}

export interface LineInput {
  quantity: number;
  unitPriceCents: number;
  vatRate: number; // 20 = 20 %
}

export interface Totals {
  totalNetCents: number;
  totalVatCents: number;
  totalGrossCents: number;
}

/** DPH sa počíta a zaokrúhľuje per riadok, potom sa sčítava. */
export function computeTotals(lines: LineInput[]): Totals {
  let totalNetCents = 0;
  let totalVatCents = 0;
  for (const line of lines) {
    const net = Math.round(line.quantity * line.unitPriceCents);
    const vat = Math.round((net * line.vatRate) / 100);
    totalNetCents += net;
    totalVatCents += vat;
  }
  return { totalNetCents, totalVatCents, totalGrossCents: totalNetCents + totalVatCents };
}

export const INVOICE_STATUSES = ["VYSTAVENA", "UHRADENA", "PO_SPLATNOSTI", "STORNO"] as const;
export const INVOICE_SOURCES = ["INTERNA", "WEB", "SUPERFAKTURA"] as const;
export type InvoiceSource = (typeof INVOICE_SOURCES)[number];

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  VYSTAVENA: "Vystavená",
  UHRADENA: "Uhradená",
  PO_SPLATNOSTI: "Po splatnosti",
  STORNO: "Storno",
};

export const INVOICE_SOURCE_LABELS: Record<string, string> = {
  INTERNA: "Interná",
  WEB: "Web",
  SUPERFAKTURA: "SuperFaktúra",
};

/**
 * Jednotný tvar externej faktúry (SuperFaktúra CSV/API aj web JSON sa mapujú sem).
 * Import je idempotentný vďaka @@unique([source, externalId]).
 */
export interface ExternalInvoiceInput {
  source: InvoiceSource;
  externalId: string;
  externalNumber?: string;
  direction: "VYDANA" | "PRIJATA";
  clientName: string;
  clientIco?: string;
  clientEmail?: string;
  issueDate: Date;
  dueDate: Date;
  variableSymbol?: string;
  status?: string;
  items: Array<{ description: string; quantity: number; unit?: string; unitPriceCents: number; vatRate: number }>;
}

/**
 * Nájde klienta podľa IČO → e-mailu → presného mena; ak neexistuje, vytvorí ho.
 */
export async function matchOrCreateClient(
  tx: Tx,
  input: { name: string; ico?: string; email?: string },
): Promise<string> {
  if (input.ico) {
    const byIco = await tx.client.findFirst({ where: { ico: input.ico } });
    if (byIco) return byIco.id;
  }
  if (input.email) {
    const byEmail = await tx.client.findFirst({ where: { email: input.email } });
    if (byEmail) return byEmail.id;
  }
  const byName = await tx.client.findFirst({ where: { name: input.name } });
  if (byName) return byName.id;

  const created = await tx.client.create({
    data: {
      type: input.ico ? "B2B" : "B2C",
      name: input.name,
      ico: input.ico ?? null,
      email: input.email ?? null,
    },
  });
  return created.id;
}

/**
 * Idempotentný import jednej externej faktúry. Vráti { created: false } ak už existuje.
 * Interné číslo (FA/PF...) sa prideľuje vždy — jednotné ID naprieč zdrojmi.
 */
export async function importExternalInvoice(input: ExternalInvoiceInput): Promise<{ created: boolean; invoiceNumber?: string }> {
  const existing = await prisma.invoice.findUnique({
    where: { source_externalId: { source: input.source, externalId: input.externalId } },
  });
  if (existing) return { created: false, invoiceNumber: existing.invoiceNumber };

  const invoiceNumber = await prisma.$transaction(async (tx) => {
    const clientId = await matchOrCreateClient(tx, {
      name: input.clientName,
      ico: input.clientIco,
      email: input.clientEmail,
    });
    const number = await nextNumber(tx, input.direction, input.issueDate.getFullYear());
    const totals = computeTotals(input.items);
    await tx.invoice.create({
      data: {
        direction: input.direction,
        source: input.source,
        externalId: input.externalId,
        externalNumber: input.externalNumber ?? null,
        invoiceNumber: number,
        clientId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        status: input.status ?? "VYSTAVENA",
        variableSymbol: input.variableSymbol ?? null,
        ...totals,
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit ?? "ks",
            unitPriceCents: item.unitPriceCents,
            vatRate: item.vatRate,
          })),
        },
      },
    });
    return number;
  });
  return { created: true, invoiceNumber };
}
