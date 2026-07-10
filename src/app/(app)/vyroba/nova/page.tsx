import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { BatchForm } from "../BatchForm";

export default async function NovaSarzaPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, shelfLifeDays: true, recipe: { select: { id: true } } },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Nová šarža" subtitle="Naplánovanie výrobnej dávky">
        <Link
          href="/vyroba"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          ← Späť na výrobu
        </Link>
      </PageHeader>

      <BatchForm
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          shelfLifeDays: p.shelfLifeDays,
          hasRecipe: p.recipe !== null,
        }))}
        today={today}
      />
    </>
  );
}
