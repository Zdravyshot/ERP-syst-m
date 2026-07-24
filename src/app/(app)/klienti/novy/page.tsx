import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import { hasFinancePermission } from "@/lib/finance/permissions";
import { ClientForm } from "../ClientForm";
import { createClient } from "../_actions";

export default async function NovyKlientPage() {
  const session = await getSession();
  return (
    <>
      <PageHeader title="Nový klient" subtitle="Pridanie B2B odberateľa alebo B2C zákazníka" />
      <ClientForm
        action={createClient}
        submitLabel="Vytvoriť klienta"
        cancelHref="/klienti"
        showFinanceFields={hasFinancePermission(session.role, "CONFIGURE")}
      />
    </>
  );
}
