import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge, INBOX_STATUS_COLORS } from "@/components/Badge";
import { formatDateTime } from "@/lib/format";
import { setInboxStatus } from "../../_actions";
import { INBOX_SOURCE_LABELS, INBOX_STATUS_LABELS } from "../../konstanty";

export default async function InboxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await prisma.inboxMessage.findUnique({ where: { id }, include: { order: true } });
  if (!message) notFound();
  const ignore = setInboxStatus.bind(null, message.id, "IGNOROVANA");
  const reopen = setInboxStatus.bind(null, message.id, "NOVA");
  return (
    <>
      <PageHeader title={message.subject ?? "Správa bez predmetu"} subtitle={`${INBOX_SOURCE_LABELS[message.source] ?? message.source} · ${formatDateTime(message.receivedAt)}`}>
        {!message.order && message.status !== "IGNOROVANA" && <Link href={`/objednavky/nova?inbox=${message.id}`} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Vytvoriť objednávku</Link>}
        {!message.order && <form action={message.status === "IGNOROVANA" ? reopen : ignore}><button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">{message.status === "IGNOROVANA" ? "Obnoviť" : "Ignorovať"}</button></form>}
      </PageHeader>
      <div className="max-w-3xl space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3"><Badge color={INBOX_STATUS_COLORS[message.status]}>{INBOX_STATUS_LABELS[message.status] ?? message.status}</Badge>{message.fromEmail && <span className="text-sm text-gray-600">Od: {message.fromEmail}</span>}</div>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-gray-800">{message.body}</pre>
        {message.order && <p className="border-t pt-4 text-sm">Vytvorená objednávka: <Link href={`/objednavky/${message.order.id}`} className="font-medium text-emerald-800 hover:underline">{message.order.orderNumber}</Link></p>}
      </div>
    </>
  );
}
