import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getMaterialStockLevels, getProductStockLevels, type StockLevel } from "@/lib/stock";
import { formatQty } from "@/lib/format";

function StockTable({ title, levels }: { title: string; levels: StockLevel[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-5 py-2 font-medium">Názov</th>
            <th className="px-5 py-2 text-right font-medium">Na sklade</th>
            <th className="px-5 py-2 text-right font-medium">Min. zásoba</th>
            <th className="px-5 py-2 text-right font-medium">Stav</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((item) => (
            <tr key={item.id} className="border-t border-gray-100">
              <td className="px-5 py-2.5 text-gray-900">{item.name}</td>
              <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                {formatQty(item.quantity, item.unit)}
              </td>
              <td className="px-5 py-2.5 text-right tabular-nums text-gray-500">
                {formatQty(item.minStock, item.unit)}
              </td>
              <td className="px-5 py-2.5 text-right">
                {item.isLow ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    Nízky stav
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    OK
                  </span>
                )}
              </td>
            </tr>
          ))}
          {levels.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                Žiadne položky
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function SkladPage() {
  const [materials, products] = await Promise.all([
    getMaterialStockLevels(),
    getProductStockLevels(),
  ]);
  const lowCount = [...materials, ...products].filter((i) => i.isLow).length;

  return (
    <>
      <PageHeader
        title="Sklad"
        subtitle={
          lowCount > 0
            ? `${lowCount} položiek pod minimálnou zásobou`
            : "Všetky zásoby nad minimom"
        }
      >
        <Link
          href="/sklad/pohyby"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Pohyby + nový pohyb
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <StockTable title="Suroviny" levels={materials} />
        <StockTable title="Hotové produkty" levels={products} />
      </div>
    </>
  );
}
