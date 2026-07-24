import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge, INVOICE_STATUS_COLORS } from "@/components/Badge";
import { formatCents, formatDate, formatQty } from "@/lib/format";
import { INVOICE_SOURCE_LABELS, INVOICE_STATUS_LABELS } from "@/lib/invoicing";
import { setInvoiceStatus } from "../../_actions";
import { InvoiceStatusActions, PrintButton } from "./InvoiceStatusActions";

export default async function FakturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
      order: { select: { id: true, orderNumber: true } },
    },
  });
  if (!invoice) notFound();

  const isIssued = invoice.direction === "VYDANA";
  const overdue = invoice.status === "VYSTAVENA" && invoice.dueDate.getTime() < Date.now();
  const counterparty = invoice.client?.name ?? invoice.supplierName ?? "—";

  const infoRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-stone-900">{value ?? "—"}</dd>
    </div>
  );

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={invoice.invoiceNumber ?? "Koncept faktúry"}
          subtitle={`${isIssued ? "Vydaná faktúra" : "Prijatá faktúra"} · ${INVOICE_SOURCE_LABELS[invoice.source] ?? invoice.source}`}
        >
          <PrintButton />
          <Link
            href="/financie/faktury"
            className="rounded-[10px] border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            ← Späť na zoznam
          </Link>
        </PageHeader>
      </div>

      {/* Tlačová hlavička — viditeľná len pri tlači */}
      <div className="mb-6 hidden print:block">
        <h1 className="font-display text-2xl font-bold text-stone-950">
          Faktúra {invoice.invoiceNumber}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Zdravý Shot · {isIssued ? "vydaná faktúra" : "prijatá faktúra"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 print:block">
        <div className="space-y-6 print:space-y-4">
          <section className="rounded-[14px] border border-stone-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-stone-900">Údaje</h2>
              {overdue ? (
                <Badge color="red">Po splatnosti</Badge>
              ) : (
                <Badge color={INVOICE_STATUS_COLORS[invoice.status]}>
                  {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                </Badge>
              )}
            </div>
            <dl className="divide-y divide-stone-100">
              {infoRow(
                isIssued ? "Odberateľ" : "Dodávateľ",
                invoice.client ? (
                  <Link href={`/klienti/${invoice.client.id}`} className="text-stone-950 hover:underline print:no-underline">
                    {counterparty}
                  </Link>
                ) : (
                  counterparty
                ),
              )}
              {invoice.client?.ico && infoRow("IČO", invoice.client.ico)}
              {invoice.client?.dic && infoRow("DIČ", invoice.client.dic)}
              {invoice.client?.icDph && infoRow("IČ DPH", invoice.client.icDph)}
              {infoRow("Dátum vystavenia", formatDate(invoice.issueDate))}
              {infoRow("Dátum splatnosti", formatDate(invoice.dueDate))}
              {invoice.deliveryDate && infoRow("Dátum dodania", formatDate(invoice.deliveryDate))}
              {invoice.variableSymbol && infoRow("Variabilný symbol", invoice.variableSymbol)}
              {invoice.externalNumber &&
                infoRow(`Číslo v ${INVOICE_SOURCE_LABELS[invoice.source] ?? invoice.source}`, invoice.externalNumber)}
              {invoice.order &&
                infoRow(
                  "Objednávka",
                  <Link href={`/objednavky/${invoice.order.id}`} className="text-stone-950 hover:underline print:no-underline">
                    {invoice.order.orderNumber}
                  </Link>,
                )}
            </dl>
            {invoice.note && (
              <p className="mt-3 rounded-[10px] bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
                {invoice.note}
              </p>
            )}
          </section>

          {(invoice.status === "VYSTAVENA" || overdue) && (
            <section className="rounded-[14px] border border-stone-200 bg-white p-5 print:hidden">
              <h2 className="mb-3 font-semibold text-stone-900">Akcie</h2>
              <InvoiceStatusActions action={setInvoiceStatus.bind(null, invoice.id)} />
            </section>
          )}
        </div>

        <div className="lg:col-span-2 print:mt-4">
          <section className="rounded-[14px] border border-stone-200 bg-white">
            <h2 className="border-b border-stone-100 px-5 py-3 font-semibold text-stone-900">Položky</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <th className="px-5 py-2">Popis</th>
                  <th className="px-5 py-2 text-right">Množstvo</th>
                  <th className="px-5 py-2 text-right">Cena/j. bez DPH</th>
                  <th className="px-5 py-2 text-right">DPH %</th>
                  <th className="px-5 py-2 text-right">Spolu bez DPH</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-stone-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-stone-900">{item.description}</td>
                    <td className="px-5 py-2.5 text-right text-stone-600">
                      {formatQty(item.quantity, item.unit)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-stone-600">{formatCents(item.unitPriceCents)}</td>
                    <td className="px-5 py-2.5 text-right text-stone-600">{item.vatRate} %</td>
                    <td className="px-5 py-2.5 text-right font-medium text-stone-900">
                      {formatCents(Math.round(item.quantity * item.unitPriceCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-200 text-sm">
                  <td colSpan={4} className="px-5 py-2 text-right text-stone-500">
                    Spolu bez DPH
                  </td>
                  <td className="px-5 py-2 text-right font-medium text-stone-900">
                    {formatCents(invoice.totalNetCents)}
                  </td>
                </tr>
                <tr className="text-sm">
                  <td colSpan={4} className="px-5 py-1 text-right text-stone-500">
                    DPH
                  </td>
                  <td className="px-5 py-1 text-right font-medium text-stone-900">
                    {formatCents(invoice.totalVatCents)}
                  </td>
                </tr>
                <tr className="text-sm">
                  <td colSpan={4} className="px-5 py-2 text-right font-semibold text-stone-900">
                    Spolu s DPH
                  </td>
                  <td className="px-5 py-2 text-right text-base font-bold text-stone-950">
                    {formatCents(invoice.totalGrossCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>
      </div>
    </>
  );
}
