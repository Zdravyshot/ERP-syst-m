import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge, CLIENT_TYPE_COLORS, ORDER_STATUS_COLORS, INVOICE_STATUS_COLORS } from "@/components/Badge";
import { formatCents, formatDate } from "@/lib/format";
import { computeTotals, INVOICE_STATUS_LABELS, INVOICE_SOURCE_LABELS } from "@/lib/invoicing";
import { orderStatusLabels, orderChannelLabels } from "@/lib/zod-schemas";
import { toggleClientActive } from "../_actions";
import { SUBSCRIPTION_FREQUENCY_LABELS } from "@/app/(app)/objednavky/konstanty";

export default async function KlientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      orders: { include: { items: true }, orderBy: { orderDate: "desc" } },
      invoices: { orderBy: { issueDate: "desc" } },
      subscriptions: { include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  const toggleAction = toggleClientActive.bind(null, client.id);
  const totalRevenueCents = client.invoices
    .filter((i) => i.direction === "VYDANA" && i.status !== "STORNO")
    .reduce((sum, i) => sum + i.totalGrossCents, 0);

  const infoRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-gray-900">{value ?? "—"}</dd>
    </div>
  );

  return (
    <>
      <PageHeader title={client.name} subtitle={`Klient · ${client.type === "B2B" ? "B2B odberateľ" : "B2C zákazník"}`}>
        <Link
          href={`/klienti/${client.id}/upravit`}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Upraviť
        </Link>
        <form action={toggleAction}>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {client.isActive ? "Deaktivovať" : "Aktivovať"}
          </button>
        </form>
        <Link
          href={`/objednavky/nova?klient=${client.id}`}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          + Objednávka
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Údaje</h2>
              <div className="flex gap-2">
                <Badge color={CLIENT_TYPE_COLORS[client.type]}>{client.type}</Badge>
                {!client.isActive && <Badge color="red">Neaktívny</Badge>}
              </div>
            </div>
            <dl className="divide-y divide-gray-100">
              {client.type === "B2B" && infoRow("IČO", client.ico)}
              {client.type === "B2B" && infoRow("DIČ", client.dic)}
              {client.type === "B2B" && infoRow("IČ DPH", client.icDph)}
              {infoRow("E-mail", client.email)}
              {infoRow("Telefón", client.phone)}
              {infoRow(
                "Adresa",
                [client.street, [client.zip, client.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
              )}
              {infoRow("Klientom od", formatDate(client.createdAt))}
              {infoRow("Tržby spolu (s DPH)", <span className="font-semibold">{formatCents(totalRevenueCents)}</span>)}
            </dl>
            {client.note && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{client.note}</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Predplatné</h2>
            {client.subscriptions.length === 0 && <p className="text-sm text-gray-400">Žiadne predplatné.</p>}
            <div className="space-y-3">
              {client.subscriptions.map((sub) => (
                <div key={sub.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {SUBSCRIPTION_FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}
                    </span>
                    <Badge color={sub.isActive ? "emerald" : "gray"}>{sub.isActive ? "Aktívne" : "Pozastavené"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Najbližšia objednávka: {formatDate(sub.nextRunDate)}</p>
                  <ul className="mt-1 text-xs text-gray-600">
                    {sub.items.map((item) => (
                      <li key={item.id}>{item.quantity}× {item.product.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">
              História objednávok ({client.orders.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-2">Číslo</th>
                  <th className="px-5 py-2">Dátum</th>
                  <th className="px-5 py-2">Kanál</th>
                  <th className="px-5 py-2">Stav</th>
                  <th className="px-5 py-2 text-right">Suma s DPH</th>
                </tr>
              </thead>
              <tbody>
                {client.orders.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Žiadne objednávky.</td></tr>
                )}
                {client.orders.map((order) => {
                  const totals = computeTotals(order.items);
                  return (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-2.5">
                        <Link href={`/objednavky/${order.id}`} className="font-medium text-emerald-800 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">{formatDate(order.orderDate)}</td>
                      <td className="px-5 py-2.5 text-gray-600">{orderChannelLabels[order.channel] ?? order.channel}</td>
                      <td className="px-5 py-2.5">
                        <Badge color={ORDER_STATUS_COLORS[order.status]}>{orderStatusLabels[order.status] ?? order.status}</Badge>
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium text-gray-900">{formatCents(totals.totalGrossCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">
              Faktúry ({client.invoices.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-2">Číslo</th>
                  <th className="px-5 py-2">Zdroj</th>
                  <th className="px-5 py-2">Vystavená</th>
                  <th className="px-5 py-2">Splatnosť</th>
                  <th className="px-5 py-2">Stav</th>
                  <th className="px-5 py-2 text-right">Suma s DPH</th>
                </tr>
              </thead>
              <tbody>
                {client.invoices.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Žiadne faktúry.</td></tr>
                )}
                {client.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-2.5 font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-5 py-2.5 text-gray-600">{INVOICE_SOURCE_LABELS[invoice.source] ?? invoice.source}</td>
                    <td className="px-5 py-2.5 text-gray-600">{formatDate(invoice.issueDate)}</td>
                    <td className="px-5 py-2.5 text-gray-600">{formatDate(invoice.dueDate)}</td>
                    <td className="px-5 py-2.5">
                      <Badge color={INVOICE_STATUS_COLORS[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">{formatCents(invoice.totalGrossCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </>
  );
}
