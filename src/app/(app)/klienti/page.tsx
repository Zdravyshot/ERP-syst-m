import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge, CLIENT_TYPE_COLORS } from "@/components/Badge";

export default async function KlientiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; typ?: string; neaktivni?: string }>;
}) {
  const { q, typ, neaktivni } = await searchParams;

  const clients = await prisma.client.findMany({
    where: {
      ...(neaktivni === "1" ? {} : { isActive: true }),
      ...(typ === "B2B" || typ === "B2C" ? { type: typ } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { ico: { contains: q } },
              { city: { contains: q } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { orders: true, invoices: true } } },
    orderBy: { name: "asc" },
  });

  const filterLink = (label: string, value?: string) => {
    const active = (typ ?? "") === (value ?? "");
    const params = new URLSearchParams();
    if (value) params.set("typ", value);
    if (q) params.set("q", q);
    if (neaktivni === "1") params.set("neaktivni", "1");
    const qs = params.toString();
    return (
      <Link
        key={label}
        href={qs ? `/klienti?${qs}` : "/klienti"}
        className={`rounded-full px-3 py-1 text-sm transition ${
          active ? "bg-emerald-700 font-medium text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageHeader title="Klienti" subtitle="B2B odberatelia a B2C zákazníci">
        <Link
          href="/klienti/novy"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          + Nový klient
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filterLink("Všetci")}
        {filterLink("B2B", "B2B")}
        {filterLink("B2C", "B2C")}
        <form action="/klienti" className="ml-auto flex gap-2">
          {typ && <input type="hidden" name="typ" value={typ} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Hľadať meno, e-mail, IČO…"
            className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Meno / názov</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">IČO</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Mesto</th>
              <th className="px-4 py-3 text-right">Objednávky</th>
              <th className="px-4 py-3 text-right">Faktúry</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Žiadni klienti nezodpovedajú filtru.
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/klienti/${client.id}`} className="font-medium text-emerald-800 hover:underline">
                    {client.name}
                  </Link>
                  {!client.isActive && <span className="ml-2 text-xs text-gray-400">(neaktívny)</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge color={CLIENT_TYPE_COLORS[client.type]}>{client.type}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">{client.ico ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{client.email ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{client.city ?? "—"}</td>
                <td className="px-4 py-3 text-right text-gray-600">{client._count.orders}</td>
                <td className="px-4 py-3 text-right text-gray-600">{client._count.invoices}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-sm">
        {neaktivni === "1" ? (
          <Link href="/klienti" className="text-gray-500 hover:underline">Skryť neaktívnych</Link>
        ) : (
          <Link href="/klienti?neaktivni=1" className="text-gray-500 hover:underline">Zobraziť aj neaktívnych</Link>
        )}
      </div>
    </>
  );
}
