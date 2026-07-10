import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { createRecipe } from "../_actions";
import { btnSecondary, btnSmall, btnSmallPrimary, card, table, thead, tr, td, tdRight } from "@/components/ui";

export default async function RecepturyPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { recipe: { include: { items: true } } },
  });

  return (
    <>
      <PageHeader title="Receptúry" subtitle="Zloženie produktov — spotreba surovín na výrobnú dávku">
        <Link href="/vyroba" className={btnSecondary}>
          ← Späť na výrobu
        </Link>
      </PageHeader>

      <div className={`${card} overflow-x-auto`}>
        <table className={table}>
          <thead>
            <tr className={thead}>
              <th className="px-[18px] py-[11px] font-medium">Produkt</th>
              <th className="px-[18px] py-[11px] text-right font-medium">Veľkosť dávky</th>
              <th className="px-[18px] py-[11px] text-right font-medium">Počet surovín</th>
              <th className="px-[18px] py-[11px] font-medium">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className={tr}>
                <td className={`${td} font-medium`}>{product.name}</td>
                <td className={tdRight}>{product.recipe ? `${product.recipe.batchSize} ks` : "—"}</td>
                <td className={tdRight}>{product.recipe ? product.recipe.items.length : "—"}</td>
                <td className="px-[18px] py-[9px]">
                  {product.recipe ? (
                    <Link href={`/vyroba/receptury/${product.recipe.id}`} className={btnSmall}>
                      Upraviť
                    </Link>
                  ) : (
                    <form action={createRecipe} className="inline">
                      <input type="hidden" name="productId" value={product.id} />
                      <button type="submit" className={btnSmallPrimary}>
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
