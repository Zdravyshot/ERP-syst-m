import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatCents, formatDate } from "@/lib/format";
import { normalizeVs } from "@/lib/finance/matching/match";
import { btnSecondary, card, cardHeader } from "@/components/ui";
import { AllocateForm, ReverseAllocationButton } from "./AllocateForm";

export default async function ParovaniePage() {
  const [unmatchedPayments, openInvoices, recentAllocations] = await Promise.all([
    prisma.payment.findMany({
      where: { direction: "INCOMING" },
      include: { allocations: { where: { reversedAt: null } } },
      orderBy: { paidAt: "desc" },
      take: 100,
    }),
    prisma.invoice.findMany({
      where: {
        direction: "VYDANA",
        documentType: "INVOICE",
        documentStatus: { not: "CANCELLED" },
        // legacy UHRADENA = historicky uhradené bez alokácií — nie sú otvorené
        status: { notIn: ["STORNO", "UHRADENA"] },
      },
      include: {
        client: { select: { name: true } },
        paymentAllocations: { where: { reversedAt: null }, select: { amountCents: true } },
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.paymentAllocation.findMany({
      where: { reversedAt: null },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        invoice: { select: { id: true, invoiceNumber: true } },
        payment: { select: { counterpartyName: true, paidAt: true, amountCents: true } },
      },
    }),
  ]);

  const open = openInvoices
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client?.name ?? "—",
      variableSymbol: inv.variableSymbol,
      outstandingCents:
        inv.totalGrossCents - inv.paymentAllocations.reduce((sum, a) => sum + a.amountCents, 0),
    }))
    .filter((inv) => inv.outstandingCents > 0);

  const pending = unmatchedPayments
    .map((payment) => ({
      ...payment,
      unallocatedCents:
        payment.amountCents - payment.allocations.reduce((sum, a) => sum + a.amountCents, 0),
    }))
    .filter((payment) => payment.unallocatedCents > 0);

  return (
    <>
      <PageHeader
        title="Manuálna kontrola platieb"
        subtitle="Prijaté platby, ktoré sa nepodarilo automaticky spárovať — čiastočné, nadmerné a nejednoznačné úhrady"
      >
        <Link href="/financie/banka" className={btnSecondary}>
          ← Banka
        </Link>
      </PageHeader>

      <div className="space-y-4">
        {pending.length === 0 && (
          <div className="rounded-[14px] border border-dashed border-stone-300 bg-white px-6 py-12 text-center text-sm text-stone-400">
            Všetky prijaté platby sú spárované 🎉
          </div>
        )}

        {pending.map((payment) => {
          const paymentVs = normalizeVs(payment.variableSymbol);
          const invoiceOptions = open.map((inv) => ({
            id: inv.id,
            label: `${inv.invoiceNumber ?? "koncept"} · ${inv.clientName}`,
            outstandingEur: formatCents(inv.outstandingCents),
            suggested:
              (paymentVs !== null && normalizeVs(inv.variableSymbol) === paymentVs) ||
              inv.outstandingCents === payment.unallocatedCents,
          }));
          const sorted = [...invoiceOptions].sort((a, b) => Number(b.suggested) - Number(a.suggested));

          return (
            <div key={payment.id} className="rounded-[14px] border border-stone-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-display text-lg font-bold text-stone-950">
                    +{formatCents(payment.unallocatedCents)}
                  </span>
                  {payment.unallocatedCents !== payment.amountCents && (
                    <span className="ml-2 text-xs text-stone-400">
                      (z platby {formatCents(payment.amountCents)} — zvyšok po alokáciách)
                    </span>
                  )}
                </div>
                <div className="text-sm text-stone-500">
                  {formatDate(payment.paidAt)} · {payment.counterpartyName ?? payment.counterpartyIban ?? "neznáma protistrana"}
                  {payment.variableSymbol && (
                    <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                      VS {payment.variableSymbol}
                    </span>
                  )}
                </div>
              </div>
              {payment.reference && (
                <p className="mb-3 text-xs text-stone-400">Správa: {payment.reference}</p>
              )}
              <AllocateForm
                paymentId={payment.id}
                defaultAmountEur={(payment.unallocatedCents / 100).toFixed(2).replace(".", ",")}
                invoices={sorted}
              />
            </div>
          );
        })}

        <div className={card}>
          <div className={cardHeader}>Posledné alokácie</div>
          <ul className="divide-y divide-stone-100 text-sm">
            {recentAllocations.map((allocation) => (
              <li key={allocation.id} className="flex items-center justify-between gap-3 px-[18px] py-2.5">
                <span className="min-w-0 truncate text-stone-700">
                  {formatDate(allocation.payment.paidAt)} ·{" "}
                  {allocation.payment.counterpartyName ?? "platba"} →{" "}
                  <Link
                    href={`/financie/faktury/${allocation.invoice.id}`}
                    className="font-medium text-stone-950 hover:underline"
                  >
                    {allocation.invoice.invoiceNumber ?? "koncept"}
                  </Link>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-medium tabular-nums text-stone-900">
                    {formatCents(allocation.amountCents)}
                  </span>
                  <ReverseAllocationButton allocationId={allocation.id} />
                </span>
              </li>
            ))}
            {recentAllocations.length === 0 && (
              <li className="px-[18px] py-6 text-center text-stone-400">Zatiaľ žiadne alokácie</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
