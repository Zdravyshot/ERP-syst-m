import { PageHeader, PlaceholderCard } from "@/components/PageHeader";

export default function FinanciePage() {
  return (
    <>
      <PageHeader
        title="Financie"
        subtitle="Faktúry (interné + web + SuperFaktúra), eKasa, marže, export"
      />
      <PlaceholderCard text="Finančný modul implementuje Dev B (branchy feat/financie, feat/import-export) — viď PLAN.md." />
    </>
  );
}
