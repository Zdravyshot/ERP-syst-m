import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { createRecipe } from "../_actions";

export default async function RecepturyPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { recipe: { include: { items: true } } },
  });

  return (
    <>
      <PageHeader title="Receptúry" subtitle="Zloženie produktov — spotreba surovín na výrobnú dávku">
        <Link
          href="/vyroba"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          ← Späť na výrobu
        </Link>
      </PageHeader>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 font-medium">Produkt</th>
              <th className="px-5 py-3 text-right font-medium">Veľkosť dávky</th>
              <th className="px-5 py-3 text-right font-medium">Počet surovín</th>
              <th className="px-5 py-3 font-medium">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-gray-100">
                <td className="px-5 py-3 font-medium text-gray-900">{product.name}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {product.recipe ? `${product.recipe.batchSize} ks` : "—"}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {product.recipe ? product.recipe.items.length : "—"}
                </td>
                <td className="px-5 py-3">
                  {product.recipe ? (
                    <Link
                      href={`/vyroba/receptury/${product.recipe.id}`}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Upraviť
                    </Link>
                  ) : (
                    <form action={createRecipe} className="inline">
                      <input type="hidden" name="productId" value={product.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Vytvoriť receptúru
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
