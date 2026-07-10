import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { formatQty } from "@/lib/format";
import { deleteRecipeItem, updateRecipe, upsertRecipeItem } from "../../_actions";

const inputClass =
  "rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export default async function RecipeEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chyba?: string }>;
}) {
  const { id } = await params;
  const { chyba } = await searchParams;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      product: { select: { name: true } },
      items: { include: { material: true }, orderBy: { material: { name: "asc" } } },
    },
  });
  if (!recipe) notFound();

  const usedMaterialIds = new Set(recipe.items.map((i) => i.materialId));
  const availableMaterials = await prisma.material.findMany({
    where: { isActive: true, id: { notIn: [...usedMaterialIds] } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title={`Receptúra: ${recipe.product.name}`}
        subtitle={`Spotreba surovín na dávku ${recipe.batchSize} ks`}
      >
        <Link
          href="/vyroba/receptury"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          ← Všetky receptúry
        </Link>
      </PageHeader>

      {chyba && (
        <p className="mb-4 max-w-3xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{chyba}</p>
      )}

      <div className="max-w-3xl space-y-6">
        <form
          action={updateRecipe}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
        >
          <input type="hidden" name="recipeId" value={recipe.id} />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Veľkosť dávky (ks)</label>
            <input
              name="batchSize"
              type="number"
              min="1"
              defaultValue={recipe.batchSize}
              className={`${inputClass} w-32`}
            />
          </div>
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">Poznámka</label>
            <input name="note" defaultValue={recipe.note ?? ""} className={`${inputClass} w-full`} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Uložiť
          </button>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
            Suroviny na {recipe.batchSize} ks
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-2 font-medium">Surovina</th>
                <th className="px-5 py-2 text-right font-medium">Množstvo</th>
                <th className="px-5 py-2 font-medium">Upraviť</th>
              </tr>
            </thead>
            <tbody>
              {recipe.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-5 py-2.5 text-gray-900">
                    {item.material.name}{" "}
                    <span className="text-xs text-gray-400">({item.material.unit})</span>
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {formatQty(item.quantity, item.material.unit)}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <form action={upsertRecipeItem} className="flex items-center gap-2">
                        <input type="hidden" name="recipeId" value={recipe.id} />
                        <input type="hidden" name="materialId" value={item.materialId} />
                        <input
                          name="quantity"
                          defaultValue={String(item.quantity).replace(".", ",")}
                          className={`${inputClass} w-24`}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Uložiť
                        </button>
                      </form>
                      <form action={deleteRecipeItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="recipeId" value={recipe.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Odstrániť
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {recipe.items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-gray-400">
                    Receptúra zatiaľ nemá žiadne suroviny — pridajte ich nižšie
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {availableMaterials.length > 0 && (
          <form
            action={upsertRecipeItem}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <input type="hidden" name="recipeId" value={recipe.id} />
            <div className="min-w-56 flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">Pridať surovinu</label>
              <select name="materialId" required className={`${inputClass} w-full`} defaultValue="">
                <option value="" disabled>
                  — vyberte —
                </option>
                {availableMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Množstvo na dávku</label>
              <input name="quantity" required placeholder="napr. 1,2" className={`${inputClass} w-32`} />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Pridať
            </button>
          </form>
        )}
      </div>
    </>
  );
}
