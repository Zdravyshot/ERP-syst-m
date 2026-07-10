import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge, ORDER_STATUS_COLORS, INVOICE_STATUS_COLORS } from "@/components/Badge";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { computeTotals, INVOICE_STATUS_LABELS } from "@/lib/invoicing";
import { orderStatusLabels, orderChannelLabels } from "@/lib/zod-schemas";
import { ORDER_STATUS_TRANSITIONS, EDITABLE_ORDER_STATUSES, SUBSCRIPTION_FREQUENCY_LABELS } from "../konstanty";
import { setOrderStatus } from "../_actions";
import { StatusActions } from "./StatusActions";

export default async function ObjednavkaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      items: { include: { product: true } },
      invoices: true,
      subscription: true,
      inboxMessage: true,
      movements: { include: { product: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const totals = computeTotals(order.items);
  const allowedStatuses = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  const isEditable = EDITABLE_ORDER_STATUSES.includes(order.status);

  const infoRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-gray-900">{value ?? "—"}</dd>
    </div>
  );

  return (
    <>
      <PageHeader title={order.orderNumber} subtitle={`Objednávka · ${orderChannelLabels[order.channel] ?? order.channel}`}>
        {isEditable && (
          <Link
            href={`/objednavky/${order.id}/upravit`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Upraviť
          </Link>
        )}
        <Link
          href="/objednavky"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          ← Späť na zoznam
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Údaje</h2>
              <Badge color={ORDER_STATUS_COLORS[order.status]}>{orderStatusLabels[order.status] ?? order.status}</Badge>
            </div>
            <dl className="divide-y divide-gray-100">
              {infoRow(
                "Klient",
                <Link href={`/klienti/${order.clientId}`} className="text-emerald-800 hover:underline">
                  {order.client.name}
                </Link>,
              )}
              {infoRow("Dátum objednávky", formatDate(order.orderDate))}
              {infoRow("Dátum dodania", formatDate(order.deliveryDate))}
              {order.externalId && infoRow("Externé ID", order.externalId)}
              {order.subscription &&
                infoRow(
                  "Predplatné",
                  <Link href="/objednavky/predplatne" className="text-emerald-800 hover:underline">
                    {SUBSCRIPTION_FREQUENCY_LABELS[order.subscription.frequency] ?? order.subscription.frequency}
                  </Link>,
                )}
              {order.inboxMessage &&
                infoRow(
                  "Zdroj",
                  <Link href={`/objednavky/inbox/${order.inboxMessage.id}`} className="text-emerald-800 hover:underline">
                    Správa z inboxu
                  </Link>,
                )}
            </dl>
            {order.note && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{order.note}</p>}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Zmena stavu</h2>
            {allowedStatuses.length === 0 ? (
              <p className="text-sm text-gray-400">Objednávka je uzavretá.</p>
            ) : (
              <StatusActions allowedStatuses={allowedStatuses} action={setOrderStatus.bind(null, order.id)} />
            )}
            {allowedStatuses.includes("EXPEDOVANA") && (
              <p className="mt-3 text-xs text-gray-400">
                Expedícia odpíše produkty zo skladu (pohyby PREDAJ). Pri nedostatku zásob sa neuskutoční.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Faktúry</h2>
            {order.invoices.length === 0 ? (
              <p className="text-sm text-gray-400">Zatiaľ žiadna faktúra.</p>
            ) : (
              <ul className="space-y-2">
                {order.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-gray-600">{formatCents(invoice.totalGrossCents)}</span>
                      <Badge color={INVOICE_STATUS_COLORS[invoice.status]}>
                        {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">Položky</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-2">Produkt</th>
                  <th className="px-5 py-2 text-right">Množstvo</th>
                  <th className="px-5 py-2 text-right">Cena/ks bez DPH</th>
                  <th className="px-5 py-2 text-right">DPH %</th>
                  <th className="px-5 py-2 text-right">Spolu bez DPH</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">
                      {item.product.name} <span className="text-xs text-gray-400">({item.product.sku})</span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-600">{item.quantity} ks</td>
                    <td className="px-5 py-2.5 text-right text-gray-600">{formatCents(item.unitPriceCents)}</td>
                    <td className="px-5 py-2.5 text-right text-gray-600">{item.vatRate} %</td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                      {formatCents(Math.round(item.quantity * item.unitPriceCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 text-sm">
                  <td colSpan={4} className="px-5 py-2 text-right text-gray-500">Spolu bez DPH</td>
                  <td className="px-5 py-2 text-right font-medium text-gray-900">{formatCents(totals.totalNetCents)}</td>
                </tr>
                <tr className="text-sm">
                  <td colSpan={4} className="px-5 py-1 text-right text-gray-500">DPH</td>
                  <td className="px-5 py-1 text-right font-medium text-gray-900">{formatCents(totals.totalVatCents)}</td>
                </tr>
                <tr className="text-sm">
                  <td colSpan={4} className="px-5 py-2 text-right font-semibold text-gray-900">Spolu s DPH</td>
                  <td className="px-5 py-2 text-right text-base font-bold text-emerald-800">{formatCents(totals.totalGrossCents)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {order.movements.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white">
              <h2 className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">Skladové pohyby</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-2">Dátum</th>
                    <th className="px-5 py-2">Produkt</th>
                    <th className="px-5 py-2 text-right">Množstvo</th>
                    <th className="px-5 py-2">Poznámka</th>
                  </tr>
                </thead>
                <tbody>
                  {order.movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 text-gray-600">{formatDateTime(movement.createdAt)}</td>
                      <td className="px-5 py-2.5 text-gray-900">{movement.product?.name ?? "—"}</td>
                      <td className={`px-5 py-2.5 text-right font-medium ${movement.quantity < 0 ? "text-red-700" : "text-emerald-700"}`}>
                        {movement.quantity > 0 ? "+" : ""}{movement.quantity} ks
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">{movement.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
