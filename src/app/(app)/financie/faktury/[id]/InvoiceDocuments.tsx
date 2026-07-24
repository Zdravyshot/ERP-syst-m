"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnSmallPrimary } from "@/components/ui";

interface InvoiceDocumentItem {
  id: string;
  type: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 1 }).format(bytes / 1024)} kB`;
}

export function InvoiceDocuments({
  invoiceId,
  documents,
  canGenerate,
}: {
  invoiceId: string;
  documents: InvoiceDocumentItem[];
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function generatePdf() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/financie/faktury/${encodeURIComponent(invoiceId)}/dokumenty`,
        {
          method: "POST",
          headers: { Accept: "application/json" },
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "PDF sa nepodarilo vygenerovať.");
      }
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "PDF sa nepodarilo vygenerovať.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[14px] border border-stone-200 bg-white p-5 print:hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-stone-900">Dokumenty</h2>
        <button
          type="button"
          className={btnSmallPrimary}
          disabled={!canGenerate || pending}
          onClick={generatePdf}
        >
          {pending ? "Generujem…" : "Vygenerovať PDF"}
        </button>
      </div>

      {!canGenerate && (
        <p className="mt-3 text-xs leading-5 text-stone-500">
          Nemenné PDF je možné vytvoriť až po finalizácii dokladu a uložení
          snapshotov.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          K faktúre zatiaľ nie je uložený žiadny dokument.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-900">
                  {document.fileName}
                </p>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  {formatBytes(document.byteSize)} · SHA-256{" "}
                  {document.sha256.slice(0, 12)}…
                </p>
              </div>
              <a
                href={`/api/financie/dokumenty/${document.id}`}
                className="shrink-0 text-xs font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-stone-950"
              >
                Stiahnuť
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
