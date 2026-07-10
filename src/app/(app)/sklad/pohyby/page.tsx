import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { formatCents, formatDateTime, formatQty } from "@/lib/format";
import { MOVEMENT_TYPE_LABELS, type MovementType } from "@/lib/stock";
import { MovementForm } from "../MovementForm";

export default async function PohybyPage() {
  const [movements, materials, products] = await Promise.all([
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        material: { select: { name: true, unit: true } },
        product: { select: { name: true, unit: true } },
        batch: { select: { batchNumber: true } },
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.material.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Skladové pohyby" subtitle="Ledger — posledných 100 pohybov">
        <Link
          href="/sklad"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          ← Stavy zásob
        </Link>
      </PageHeader>

      <MovementForm materials={materials} products={products} />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 font-medium">Dátum</th>
              <th className="px-5 py-3 font-medium">Typ</th>
              <th className="px-5 py-3 font-medium">Položka</th>
              <th className="px-5 py-3 text-right font-medium">Množstvo</th>
              <th className="px-5 py-3 text-right font-medium">Cena/jedn.</th>
              <th className="px-5 py-3 font-medium">Väzba</th>
              <th className="px-5 py-3 font-medium">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const item = m.material ?? m.product;
              return (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="whitespace-nowrap px-5 py-2.5 text-gray-500">
                    {formatDateTime(m.createdAt)}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {MOVEMENT_TYPE_LABELS[m.type as MovementType] ?? m.type}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-gray-900">{item?.name ?? "—"}</td>
                  <td
                    className={`px-5 py-2.5 text-right font-medium tabular-nums ${
                      m.quantity < 0 ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {m.quantity > 0 ? "+" : ""}
                    {formatQty(m.quantity, item?.unit)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-gray-500">
                    {m.unitPriceCents != null ? formatCents(m.unitPriceCents) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-gray-500">
                    {m.batch?.batchNumber ?? m.order?.orderNumber ?? "—"}
                  </td>
                  <td className="max-w-56 truncate px-5 py-2.5 text-gray-500">{m.note ?? "—"}</td>
                </tr>
              );
            })}
            {movements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                  Zatiaľ žiadne pohyby
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
