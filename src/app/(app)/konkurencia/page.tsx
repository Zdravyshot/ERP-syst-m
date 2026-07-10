import { PageHeader, PlaceholderCard } from "@/components/PageHeader";

export default function KonkurenciaPage() {
  return (
    <>
      <PageHeader
        title="Konkurencia"
        subtitle="Sledovanie konkurencie — externý model sa pripojí neskôr"
      />
      <PlaceholderCard text="Pripravený vstupný bod: GET /api/konkurencia. Externý model na sledovanie konkurencie pripojíme v ďalšej fáze." />
    </>
  );
}
