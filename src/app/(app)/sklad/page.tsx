import { PageHeader, PlaceholderCard } from "@/components/PageHeader";

export default function SkladPage() {
  return (
    <>
      <PageHeader title="Sklad" subtitle="Stavy zásob surovín a hotových produktov, pohyby" />
      <PlaceholderCard text="Modul Sklad implementuje Dev A (branch feat/sklad) — viď PLAN.md." />
    </>
  );
}
