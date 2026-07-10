import { PageHeader, PlaceholderCard } from "@/components/PageHeader";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Prehľad" subtitle="Kľúčové ukazovatele firmy Zdravý shot" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["Tržby tento mesiac", "Otvorené objednávky", "Nízke zásoby", "Plnenie plánu"].map((label) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-bold text-gray-300">—</div>
          </div>
        ))}
      </div>
      <PlaceholderCard text="Dashboard sa napojí na reálne dáta vo fáze „Plán + Dashboard“ (Dev A)." />
    </>
  );
}
