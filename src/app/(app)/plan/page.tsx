import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { formatCents, MONTH_NAMES_SK } from "@/lib/format";
import { actualsFor, fulfillmentPct, getMonthlyActualsMap } from "@/lib/reporting";
import { PlanForm } from "./PlanForm";

function FulfillmentBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">bez cieľa</span>;
  const color = pct >= 100 ? "bg-emerald-600" : pct >= 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-gray-700">{pct} %</span>
    </div>
  );
}

export default async function PlanPage() {
  const [plans, actualsMap] = await Promise.all([
    prisma.monthlyPlan.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] }),
    getMonthlyActualsMap(),
  ]);

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Plnenie plánu"
        subtitle="Mesačné ciele vs. skutočnosť (faktúry + eKasa, hotové šarže) — počítané live"
      />

      <PlanForm defaultYear={now.getFullYear()} defaultMonth={now.getMonth() + 1} />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 font-medium">Mesiac</th>
              <th className="px-5 py-3 text-right font-medium">Cieľ tržieb</th>
              <th className="px-5 py-3 text-right font-medium">Skutočnosť</th>
              <th className="px-5 py-3 font-medium">Plnenie</th>
              <th className="px-5 py-3 text-right font-medium">Cieľ výroby</th>
              <th className="px-5 py-3 text-right font-medium">Vyrobené</th>
              <th className="px-5 py-3 font-medium">Plnenie</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const actual = actualsFor(actualsMap, plan.year, plan.month);
              return (
                <tr key={plan.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {MONTH_NAMES_SK[plan.month - 1]} {plan.year}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                    {formatCents(plan.targetRevenueCents)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">
                    {formatCents(actual.revenueCents)}
                  </td>
                  <td className="px-5 py-3">
                    <FulfillmentBar pct={fulfillmentPct(actual.revenueCents, plan.targetRevenueCents)} />
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                    {plan.targetProductionUnits} ks
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">
                    {actual.productionUnits} ks
                  </td>
                  <td className="px-5 py-3">
                    <FulfillmentBar
                      pct={fulfillmentPct(actual.productionUnits, plan.targetProductionUnits)}
                    />
                  </td>
                </tr>
              );
            })}
            {plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                  Zatiaľ žiadne plány — nastavte prvý cieľ vo formulári vyššie
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
