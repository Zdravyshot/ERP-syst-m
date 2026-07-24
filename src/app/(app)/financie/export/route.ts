import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function csvField(value: string | null | undefined): string {
  const s = value ?? "";
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function formatDateSk(date: Date | null | undefined): string {
  if (!date) return "";
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

function eur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * CSV export faktúr pre účtovníka.
 * GET /financie/export?od=2026-07-01&do=2026-07-31&smer=VYDANA&zdroj=SUPERFAKTURA
 * Oddeľovač ; (slovenský Excel), UTF-8 s BOM.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return new Response("Neprihlásený", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const od = params.get("od");
  const doDate = params.get("do");
  const smer = params.get("smer");
  const zdroj = params.get("zdroj");

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(smer === "VYDANA" || smer === "PRIJATA" ? { direction: smer } : {}),
      ...(zdroj === "INTERNA" || zdroj === "WEB" || zdroj === "SUPERFAKTURA" ? { source: zdroj } : {}),
      ...(od || doDate
        ? {
            issueDate: {
              ...(od ? { gte: new Date(od) } : {}),
              ...(doDate ? { lte: new Date(`${doDate}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include: { client: true },
    orderBy: [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
  });

  const header = [
    "Interné číslo",
    "Externé číslo",
    "Zdroj",
    "Smer",
    "Klient/Dodávateľ",
    "IČO",
    "DIČ",
    "IČ DPH",
    "Dátum vystavenia",
    "Dátum splatnosti",
    "Dátum dodania",
    "Základ",
    "DPH",
    "Spolu",
    "VS",
    "Stav",
  ].join(";");

  const lines = invoices.map((inv) =>
    [
      csvField(inv.invoiceNumber),
      csvField(inv.externalNumber),
      csvField(inv.source),
      csvField(inv.direction === "VYDANA" ? "Vydaná" : "Prijatá"),
      csvField(inv.client?.name ?? inv.supplierName),
      csvField(inv.client?.ico),
      csvField(inv.client?.dic),
      csvField(inv.client?.icDph),
      formatDateSk(inv.issueDate),
      formatDateSk(inv.dueDate),
      formatDateSk(inv.deliveryDate),
      eur(inv.totalNetCents),
      eur(inv.totalVatCents),
      eur(inv.totalGrossCents),
      csvField(inv.variableSymbol),
      csvField(inv.status),
    ].join(";"),
  );

  const csv = "﻿" + [header, ...lines].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="faktury-${today}.csv"`,
    },
  });
}
