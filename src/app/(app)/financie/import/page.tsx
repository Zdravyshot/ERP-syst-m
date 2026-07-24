import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { btnSecondary } from "@/components/ui";
import { SuperfakturaImport } from "./SuperfakturaImport";

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import faktúr"
        subtitle="SuperFaktúra CSV — zjednotenie do jednej evidencie s internými číslami"
      >
        <Link href="/financie/ekasa" className={btnSecondary}>
          eKasa import
        </Link>
        <Link href="/financie/faktury" className={btnSecondary}>
          ← Späť na faktúry
        </Link>
      </PageHeader>

      <div className="max-w-4xl space-y-5">
        <SuperfakturaImport />

        <div className="rounded-[14px] border border-dashed border-stone-300 bg-white px-5 py-4 text-sm text-stone-500">
          <span className="font-medium text-stone-700">Web (e-shop):</span> faktúry a objednávky z
          webu prichádzajú automaticky cez <code className="rounded bg-stone-100 px-1">POST /api/inbox</code>{" "}
          — spracúvajú sa v sekcii Objednávky → Inbox. SuperFaktúra API sync (bez CSV) je plánovaný
          follow-up, importér je naň pripravený.
        </div>
      </div>
    </>
  );
}
