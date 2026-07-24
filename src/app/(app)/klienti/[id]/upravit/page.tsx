import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasFinancePermission } from "@/lib/finance/permissions";
import { PageHeader } from "@/components/PageHeader";
import { ClientForm } from "../../ClientForm";
import { updateClient } from "../../_actions";

export default async function UpravitKlientaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <>
      <PageHeader title={`Upraviť: ${client.name}`} subtitle="Úprava údajov klienta" />
      <ClientForm
        action={updateClient.bind(null, client.id)}
        initial={{
          type: client.type,
          name: client.name,
          ico: client.ico ?? "",
          dic: client.dic ?? "",
          icDph: client.icDph ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          iban: client.iban ?? "",
          street: client.street ?? "",
          city: client.city ?? "",
          zip: client.zip ?? "",
          note: client.note ?? "",
        }}
        submitLabel="Uložiť zmeny"
        cancelHref={`/klienti/${client.id}`}
        showFinanceFields={hasFinancePermission(session.role, "CONFIGURE")}
      />
    </>
  );
}
