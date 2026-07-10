import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge, ORDER_STATUS_COLORS } from "@/components/Badge";
import { formatCents, formatDate } from "@/lib/format";
import { computeTotals } from "@/lib/invoicing";
import { orderStatusLabels, orderChannelLabels } from "@/lib/zod-schemas";

export default async function ObjednavkyPage({
  searchParams,
}: {
  searchParams: Promise<{ stav?: string }>;
}) {
  const { stav } = await searchParams;
  const statusFilter = stav && stav in orderStatusLabels ? stav : undefined;

  const [orders, newInboxCount] = await Promise.all([
    prisma.order.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      include: { client: true, items: true, invoices: { select: { id: true } } },
      orderBy: { orderDate: "desc" },
    }),
    prisma.inboxMessage.count({ where: { status: "NOVA" } }),
  ]);

  return (
    <>
      <PageHeader title="Objednávky" subtitle="Manuálne, web, e-mail a predplatné">
        <Link
          href="/objednavky/inbox"
          className="relative rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          📥 Inbox
          {newInboxCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
              {newInboxCount}
            </span>
          )}
        </Link>
        <Link
          href="/objednavky/predplatne"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          🔁 Predplatné
        </Link>
        <Link
          href="/objednavky/nova"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          + Nová objednávka
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/objednavky"
          className={`rounded-full px-3 py-1 text-sm transition ${
            !statusFilter ? "bg-emerald-700 font-medium text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
          }`}
        >
          Všetky
        </Link>
        {Object.entries(orderStatusLabels).map(([value, label]) => (
          <Link
            key={value}
            href={`/objednavky?stav=${value}`}
            className={`rounded-full px-3 py-1 text-sm transition ${
              statusFilter === value ? "bg-emerald-700 font-medium text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Číslo</th>
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Dátum</th>
              <th className="px-4 py-3">Dodanie</th>
              <th className="px-4 py-3">Kanál</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3 text-right">Položky</th>
              <th className="px-4 py-3 text-right">Suma s DPH</th>
              <th className="px-4 py-3">Faktúra</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">Žiadne objednávky.</td>
              </tr>
            )}
            {orders.map((order) => {
              const totals = computeTotals(order.items);
              return (
                <tr key={order.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/objednavky/${order.id}`} className="font-medium text-emerald-800 hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/klienti/${order.clientId}`} className="text-gray-700 hover:underline">
                      {order.client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(order.orderDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(order.deliveryDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{orderChannelLabels[order.channel] ?? order.channel}</td>
                  <td className="px-4 py-3">
                    <Badge color={ORDER_STATUS_COLORS[order.status]}>{orderStatusLabels[order.status] ?? order.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{order.items.length}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCents(totals.totalGrossCents)}</td>
                  <td className="px-4 py-3 text-gray-600">{order.invoices.length > 0 ? "✓" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
