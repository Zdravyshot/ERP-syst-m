import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { CompleteBatchButton } from "./CompleteBatchButton";
import { cancelBatch } from "./_actions";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PLANNED: { label: "Naplánovaná", className: "bg-amber-100 text-amber-700" },
  DONE: { label: "Hotová", className: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Zrušená", className: "bg-gray-100 text-gray-500" },
};

function ExpiryBadge({ expiryDate, status }: { expiryDate: Date; status: string }) {
  if (status !== "DONE") return <span className="text-gray-500">{formatDate(expiryDate)}</span>;
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 3600 * 1000));
  if (daysLeft < 0) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        Exspirovaná {formatDate(expiryDate)}
      </span>
    );
  }
  if (daysLeft <= 7) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        {formatDate(expiryDate)} (o {daysLeft} d.)
      </span>
    );
  }
  return <span className="text-gray-500">{formatDate(expiryDate)}</span>;
}

export default async function VyrobaPage() {
  const batches = await prisma.productionBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="Výroba" subtitle="Výrobné šarže a exspirácie">
        <Link
          href="/vyroba/receptury"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Receptúry
        </Link>
        <Link
          href="/vyroba/nova"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          + Nová šarža
        </Link>
      </PageHeader>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 font-medium">Šarža</th>
              <th className="px-5 py-3 font-medium">Produkt</th>
              <th className="px-5 py-3 text-right font-medium">Kusov</th>
              <th className="px-5 py-3 font-medium">Výroba</th>
              <th className="px-5 py-3 font-medium">Exspirácia</th>
              <th className="px-5 py-3 font-medium">Stav</th>
              <th className="px-5 py-3 font-medium">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => {
              const status = STATUS_LABELS[batch.status] ?? STATUS_LABELS.PLANNED;
              return (
                <tr key={batch.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-medium text-gray-900">{batch.batchNumber}</td>
                  <td className="px-5 py-3 text-gray-700">{batch.product.name}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{batch.producedQty}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-500">
                    {formatDate(batch.productionDate)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <ExpiryBadge expiryDate={batch.expiryDate} status={batch.status} />
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {batch.status === "PLANNED" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <CompleteBatchButton batchId={batch.id} />
                        <form action={cancelBatch} className="inline">
                          <input type="hidden" name="batchId" value={batch.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                          >
                            Zrušiť
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {batches.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                  Zatiaľ žiadne šarže — vytvorte prvú tlačidlom „+ Nová šarža“
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
