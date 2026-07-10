import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Badge, INBOX_STATUS_COLORS } from "@/components/Badge";
import { formatDateTime } from "@/lib/format";
import { INBOX_SOURCE_LABELS, INBOX_STATUS_LABELS } from "../konstanty";

export default async function InboxPage() {
  const messages = await prisma.inboxMessage.findMany({ include: { order: true }, orderBy: { receivedAt: "desc" } });
  return (
    <>
      <PageHeader title="Inbox objednávok" subtitle="Správy z webu, e-mailu a manuálne vstupy" />
      <div className="overflow-x-auto rounded-[14px] border border-stone-200 bg-white"><table className="w-full text-sm">
        <thead><tr className="border-b bg-stone-50 text-left text-xs uppercase text-stone-500"><th className="px-4 py-3">Prijaté</th><th className="px-4 py-3">Zdroj</th><th className="px-4 py-3">Odosielateľ</th><th className="px-4 py-3">Predmet</th><th className="px-4 py-3">Stav</th><th className="px-4 py-3">Objednávka</th></tr></thead>
        <tbody>{messages.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-400">Inbox je prázdny.</td></tr>}{messages.map((message) => <tr key={message.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50"><td className="px-4 py-3 text-stone-600">{formatDateTime(message.receivedAt)}</td><td className="px-4 py-3">{INBOX_SOURCE_LABELS[message.source] ?? message.source}</td><td className="px-4 py-3 text-stone-600">{message.fromEmail ?? "—"}</td><td className="px-4 py-3"><Link href={`/objednavky/inbox/${message.id}`} className="font-medium text-stone-950 hover:underline">{message.subject ?? "(bez predmetu)"}</Link></td><td className="px-4 py-3"><Badge color={INBOX_STATUS_COLORS[message.status]}>{INBOX_STATUS_LABELS[message.status] ?? message.status}</Badge></td><td className="px-4 py-3">{message.order ? <Link href={`/objednavky/${message.order.id}`} className="text-stone-950 hover:underline">{message.order.orderNumber}</Link> : "—"}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}
