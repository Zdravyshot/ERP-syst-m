import { PageHeader } from "@/components/PageHeader";
import { ClientForm } from "../ClientForm";
import { createClient } from "../_actions";

export default function NovyKlientPage() {
  return (
    <>
      <PageHeader title="Nový klient" subtitle="Pridanie B2B odberateľa alebo B2C zákazníka" />
      <ClientForm action={createClient} submitLabel="Vytvoriť klienta" cancelHref="/klienti" />
    </>
  );
}
