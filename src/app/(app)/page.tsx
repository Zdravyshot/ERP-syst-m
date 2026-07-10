import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { formatCents, formatDate, formatQty } from "@/lib/format";
import { getLowStockItems } from "@/lib/stock";
import { actualsFor, fulfillmentPct, getMonthlyActualsMap } from "@/lib/reporting";
import { orderStatusLabels } from "@/lib/zod-schemas";

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </div>
  );
}

function SectionCard({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <Link href={href} className="text-xs font-medium text-emerald-700 hover:underline">
          Zobraziť →
        </Link>
      </div>
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  const [actualsMap, lowStock, openOrdersCount, recentOrders, expiringBatches, currentPlan] =
    await Promise.all([
      getMonthlyActualsMap(),
      getLowStockItems(),
      prisma.order.count({ where: { status: { in: ["NOVA", "POTVRDENA", "VO_VYROBE"] } } }),
      prisma.order.findMany({
        orderBy: { orderDate: "desc" },
        take: 5,
        include: { client: { select: { name: true } } },
      }),
      prisma.productionBatch.findMany({
        where: { status: "DONE", expiryDate: { lte: in7Days } },
        orderBy: { expiryDate: "asc" },
        take: 5,
        include: { product: { select: { name: true } } },
      }),
      prisma.monthlyPlan.findUnique({
        where: { year_month: { year: now.getFullYear(), month: now.getMonth() + 1 } },
      }),
    ]);

  const actuals = actualsFor(actualsMap, now.getFullYear(), now.getMonth() + 1);
  const lowStockCount = lowStock.materials.length + lowStock.products.length;
  const planPct = currentPlan
    ? fulfillmentPct(actuals.revenueCents, currentPlan.targetRevenueCents)
    : null;

  return (
    <>
      <PageHeader title="Prehľad" subtitle="Kľúčové ukazovatele firmy Zdravý shot" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tržby tento mesiac"
          value={formatCents(actuals.revenueCents)}
          hint="vydané faktúry + eKasa"
        />
        <KpiCard label="Otvorené objednávky" value={String(openOrdersCount)} hint="nové, potvrdené, vo výrobe" />
        <KpiCard
          label="Nízke zásoby"
          value={String(lowStockCount)}
          hint={lowStockCount > 0 ? "položiek pod minimom" : "všetko nad minimom"}
        />
        <KpiCard
          label="Plnenie plánu"
          value={planPct !== null ? `${planPct} %` : "—"}
          hint={currentPlan ? `cieľ ${formatCents(currentPlan.targetRevenueCents)}` : "plán nie je nastavený"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Nízke zásoby" href="/sklad">
          <ul className="divide-y divide-gray-100 text-sm">
            {[...lowStock.materials, ...lowStock.products].slice(0, 6).map((item) => (
              <li key={item.id} className="flex justify-between px-5 py-2.5">
                <span className="text-gray-900">{item.name}</span>
                <span className="tabular-nums text-red-600">
                  {formatQty(item.quantity, item.unit)}{" "}
                  <span className="text-gray-400">/ min {formatQty(item.minStock)}</span>
                </span>
              </li>
            ))}
            {lowStockCount === 0 && (
              <li className="px-5 py-6 text-center text-gray-400">Všetky zásoby sú nad minimom 🎉</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard title="Blížiace sa exspirácie (7 dní)" href="/vyroba">
          <ul className="divide-y divide-gray-100 text-sm">
            {expiringBatches.map((batch) => (
              <li key={batch.id} className="flex justify-between px-5 py-2.5">
                <span className="text-gray-900">
                  {batch.batchNumber} <span className="text-gray-400">· {batch.product.name}</span>
                </span>
                <span className="tabular-nums text-amber-600">{formatDate(batch.expiryDate)}</span>
              </li>
            ))}
            {expiringBatches.length === 0 && (
              <li className="px-5 py-6 text-center text-gray-400">Žiadne šarže neexspirujú do 7 dní</li>
            )}
          </ul>
        </SectionCard>

        <SectionCard title="Posledné objednávky" href="/objednavky">
          <ul className="divide-y divide-gray-100 text-sm">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-gray-900">
                  {order.orderNumber} <span className="text-gray-400">· {order.client.name}</span>
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {orderStatusLabels[order.status] ?? order.status}
                </span>
              </li>
            ))}
            {recentOrders.length === 0 && (
              <li className="px-5 py-6 text-center text-gray-400">Zatiaľ žiadne objednávky</li>
            )}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
