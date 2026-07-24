"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  computeTotals,
  importExternalInvoice,
  nextNumber,
  INVOICE_STATUS_LABELS,
} from "@/lib/invoicing";
import { invoiceDirectionSchema, invoiceStatusSchema } from "@/lib/zod-schemas";

export interface InvoiceFormState {
  error?: string;
  success?: string;
}

/** Povolené prechody stavov faktúry. PO_SPLATNOSTI je len zobrazovací stav (dueDate < dnes). */
const INVOICE_STATUS_TRANSITIONS: Record<string, string[]> = {
  VYSTAVENA: ["UHRADENA", "STORNO"],
  UHRADENA: [],
  STORNO: [],
};

// ---------- Vystavenie faktúry z objednávky ----------

export async function issueInvoiceFromOrder(
  orderId: string,
  _prev: InvoiceFormState,
  _formData: FormData,
): Promise<InvoiceFormState> {
  await requireUser();

  let invoiceId = "";
  try {
    invoiceId = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { client: true, items: { include: { product: true } }, invoices: true },
      });
      if (!order) throw new Error("Objednávka neexistuje.");
      if (order.status === "ZRUSENA") throw new Error("Zo zrušenej objednávky nemožno vystaviť faktúru.");
      if (order.items.length === 0) throw new Error("Objednávka nemá položky.");
      const existing = order.invoices.find((i) => i.direction === "VYDANA" && i.status !== "STORNO");
      if (existing) throw new Error(`K objednávke už existuje faktúra ${existing.invoiceNumber}.`);

      const now = new Date();
      const invoiceNumber = await nextNumber(tx, "VYDANA", now.getFullYear());
      const totals = computeTotals(order.items);
      const created = await tx.invoice.create({
        data: {
          direction: "VYDANA",
          source: "INTERNA",
          invoiceNumber,
          clientId: order.clientId,
          orderId: order.id,
          issueDate: now,
          dueDate: new Date(now.getTime() + 14 * 24 * 3600 * 1000),
          deliveryDate: order.deliveryDate,
          variableSymbol: invoiceNumber.replace(/\D/g, ""),
          ...totals,
          items: {
            create: order.items.map((item) => ({
              description: `${item.product.name} (${item.product.sku})`,
              quantity: item.quantity,
              unit: item.product.unit,
              unitPriceCents: item.unitPriceCents,
              vatRate: item.vatRate,
            })),
          },
        },
      });
      return created.id;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Faktúru sa nepodarilo vystaviť." };
  }

  revalidatePath("/financie");
  revalidatePath("/financie/faktury");
  revalidatePath(`/objednavky/${orderId}`);
  redirect(`/financie/faktury/${invoiceId}`);
}

// ---------- Ručná faktúra ----------

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Popis položky je povinný"),
  quantity: z.number().positive("Množstvo musí byť kladné"),
  unit: z.string().min(1),
  unitPriceCents: z.number().int("Cena musí byť v centoch"),
  vatRate: z.number().int().nonnegative(),
});

const manualInvoiceSchema = z
  .object({
    direction: invoiceDirectionSchema,
    clientId: z.string().optional(),
    supplierName: z.string().optional(),
    externalNumber: z.string().optional(),
    issueDate: z.date(),
    dueDate: z.date(),
    deliveryDate: z.date().optional(),
    variableSymbol: z.string().optional(),
    note: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1, "Pridajte aspoň jednu položku"),
  })
  .refine((d) => (d.direction === "VYDANA" ? !!d.clientId : true), {
    message: "Pri vydanej faktúre vyberte klienta.",
  })
  .refine((d) => (d.direction === "PRIJATA" ? !!d.supplierName || !!d.clientId : true), {
    message: "Pri prijatej faktúre zadajte dodávateľa.",
  });

export async function createManualInvoice(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireUser();

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Neplatné položky faktúry." };
  }

  const dateOf = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    return raw ? new Date(raw) : undefined;
  };

  const parsed = manualInvoiceSchema.safeParse({
    direction: String(formData.get("direction") ?? ""),
    clientId: String(formData.get("clientId") ?? "").trim() || undefined,
    supplierName: String(formData.get("supplierName") ?? "").trim() || undefined,
    externalNumber: String(formData.get("externalNumber") ?? "").trim() || undefined,
    issueDate: dateOf("issueDate") ?? new Date(),
    dueDate: dateOf("dueDate") ?? new Date(Date.now() + 14 * 24 * 3600 * 1000),
    deliveryDate: dateOf("deliveryDate"),
    variableSymbol: String(formData.get("variableSymbol") ?? "").trim() || undefined,
    note: String(formData.get("note") ?? "").trim() || undefined,
    items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };

  const data = parsed.data;
  const totals = computeTotals(data.items);

  const invoiceId = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextNumber(tx, data.direction, data.issueDate.getFullYear());
    const created = await tx.invoice.create({
      data: {
        direction: data.direction,
        source: "INTERNA",
        invoiceNumber,
        externalNumber: data.externalNumber ?? null,
        clientId: data.clientId ?? null,
        supplierName: data.supplierName ?? null,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        deliveryDate: data.deliveryDate ?? null,
        variableSymbol: data.variableSymbol ?? invoiceNumber.replace(/\D/g, ""),
        note: data.note ?? null,
        ...totals,
        items: { create: data.items },
      },
    });
    return created.id;
  });

  revalidatePath("/financie");
  revalidatePath("/financie/faktury");
  redirect(`/financie/faktury/${invoiceId}`);
}

// ---------- Zmena stavu ----------

export async function setInvoiceStatus(
  invoiceId: string,
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const parsed = invoiceStatusSchema.safeParse(String(formData.get("status") ?? ""));
  if (!parsed.success) return { error: "Neplatný stav." };
  await requireUser();

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { error: "Faktúra neexistuje." };
  if (!(INVOICE_STATUS_TRANSITIONS[invoice.status] ?? []).includes(parsed.data)) {
    return {
      error: `Prechod zo stavu „${INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}“ na „${INVOICE_STATUS_LABELS[parsed.data] ?? parsed.data}“ nie je povolený.`,
    };
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: parsed.data } });

  revalidatePath("/financie");
  revalidatePath("/financie/faktury");
  revalidatePath(`/financie/faktury/${invoiceId}`);
  return { success: `Stav zmenený na „${INVOICE_STATUS_LABELS[parsed.data]}“.` };
}

// ---------- SuperFaktúra import ----------
// Klient parsuje CSV v prehliadači (preview) a posiela už namapované riadky.

const superfakturaRowSchema = z.object({
  externalId: z.string().min(1),
  externalNumber: z.string().optional(),
  direction: invoiceDirectionSchema,
  clientName: z.string().min(1),
  clientIco: z.string().optional(),
  clientEmail: z.string().optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  variableSymbol: z.string().optional(),
  netCents: z.number().int(),
  vatRate: z.number().int().nonnegative(),
  paid: z.boolean().optional(),
});

export async function importSuperfakturaRows(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireUser();

  let rowsRaw: unknown;
  try {
    rowsRaw = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { error: "Neplatné dáta importu." };
  }
  const rows = z.array(superfakturaRowSchema).max(500, "Naraz možno importovať max 500 faktúr.").safeParse(rowsRaw);
  if (!rows.success) return { error: rows.error.issues[0]?.message ?? "Neplatné riadky importu." };
  if (rows.data.length === 0) return { error: "Súbor neobsahuje žiadne faktúry." };

  let created = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const row of rows.data) {
    try {
      const issueDate = new Date(row.issueDate);
      const dueDate = new Date(row.dueDate);
      if (Number.isNaN(issueDate.getTime()) || Number.isNaN(dueDate.getTime())) {
        throw new Error("neplatný dátum");
      }
      const result = await importExternalInvoice({
        source: "SUPERFAKTURA",
        externalId: row.externalId,
        externalNumber: row.externalNumber,
        direction: row.direction,
        clientName: row.clientName,
        clientIco: row.clientIco,
        clientEmail: row.clientEmail,
        issueDate,
        dueDate,
        variableSymbol: row.variableSymbol,
        status: row.paid ? "UHRADENA" : "VYSTAVENA",
        items: [
          {
            description: `Faktúra ${row.externalNumber ?? row.externalId} (SuperFaktúra)`,
            quantity: 1,
            unit: "ks",
            unitPriceCents: row.netCents,
            vatRate: row.vatRate,
          },
        ],
      });
      if (result.created) created += 1;
      else skipped += 1;
    } catch {
      failed.push(row.externalNumber ?? row.externalId);
    }
  }

  revalidatePath("/financie");
  revalidatePath("/financie/faktury");

  const parts = [`Importované: ${created}`, `preskočené (už existujú): ${skipped}`];
  if (failed.length > 0) parts.push(`chybné: ${failed.join(", ")}`);
  return failed.length > 0 && created === 0 && skipped === 0
    ? { error: parts.join(" · ") }
    : { success: parts.join(" · ") };
}

// ---------- eKasa import ----------

const ekasaRowSchema = z.object({
  saleDate: z.string().min(1),
  receiptNumber: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().positive().default(1),
  totalGrossCents: z.number().int(),
  vatRate: z.number().int().nonnegative().default(20),
});

export async function importEkasaRows(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireUser();

  const importBatch = String(formData.get("importBatch") ?? "import").slice(0, 200);
  let rowsRaw: unknown;
  try {
    rowsRaw = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { error: "Neplatné dáta importu." };
  }
  const rows = z.array(ekasaRowSchema).max(2000, "Naraz možno importovať max 2000 riadkov.").safeParse(rowsRaw);
  if (!rows.success) return { error: rows.error.issues[0]?.message ?? "Neplatné riadky importu." };
  if (rows.data.length === 0) return { error: "Súbor neobsahuje žiadne predaje." };

  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const productByName = new Map(products.map((p) => [p.name.toLowerCase(), p.id]));

  let created = 0;
  let skipped = 0;
  let invalid = 0;

  for (const row of rows.data) {
    const saleDate = new Date(row.saleDate);
    if (Number.isNaN(saleDate.getTime())) {
      invalid += 1;
      continue;
    }
    try {
      await prisma.ekasaSale.create({
        data: {
          saleDate,
          receiptNumber: row.receiptNumber ?? null,
          description: row.description ?? null,
          productId: row.description ? (productByName.get(row.description.toLowerCase()) ?? null) : null,
          quantity: row.quantity,
          totalGrossCents: row.totalGrossCents,
          vatRate: row.vatRate,
          importBatch,
        },
      });
      created += 1;
    } catch (e) {
      // duplicitný doklad (unique receiptNumber+saleDate) — preskočiť
      if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") skipped += 1;
      else invalid += 1;
    }
  }

  revalidatePath("/financie");
  revalidatePath("/financie/ekasa");
  revalidatePath("/plan");
  revalidatePath("/");

  const parts = [`Importované: ${created}`, `duplikáty: ${skipped}`];
  if (invalid > 0) parts.push(`chybné riadky: ${invalid}`);
  return created === 0 && skipped === 0 ? { error: parts.join(" · ") } : { success: parts.join(" · ") };
}
