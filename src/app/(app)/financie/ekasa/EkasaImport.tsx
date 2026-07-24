"use client";

import { useState } from "react";
import { useActionState } from "react";
import { importEkasaRows, type InvoiceFormState } from "../_actions";
import { formatCents } from "@/lib/format";
import { btnPrimary, errorBox, label } from "@/components/ui";
import { findColumn, parseAmountToCents, parseCsv, parseSkDate } from "../import/csv";

interface PreviewRow {
  saleDate: string;
  receiptNumber?: string;
  description?: string;
  quantity: number;
  totalGrossCents: number;
  vatRate: number;
}

export function EkasaImport() {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(importEkasaRows, {});
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importBatch, setImportBatch] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    setPreview([]);
    setParseError(null);
    if (!file) return;

    setImportBatch(`${file.name} · ${new Date().toISOString()}`);
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (rows.length === 0) {
      setParseError("Súbor neobsahuje žiadne riadky.");
      return;
    }

    const col = {
      date: findColumn(headers, ["datum", "date"]),
      receipt: findColumn(headers, ["doklad", "paragon", "poradove", "cislo"]),
      description: findColumn(headers, ["popis", "nazov", "polozka", "produkt"]),
      quantity: findColumn(headers, ["mnozstvo", "pocet", "ks"]),
      gross: findColumn(headers, ["s dph", "suma", "cena", "spolu", "celkom"]),
      vat: findColumn(headers, ["sadzba", "dph %"]),
    };

    if (col.date < 0 || col.gross < 0) {
      setParseError(
        `V CSV chýbajú povinné stĺpce (dátum, suma). Nájdené hlavičky: ${headers.join(", ")}`,
      );
      return;
    }

    const parsed: PreviewRow[] = [];
    for (const row of rows) {
      const saleDate = parseSkDate(row[col.date] ?? "");
      const totalGrossCents = parseAmountToCents(row[col.gross] ?? "");
      if (!saleDate || totalGrossCents === null) continue;

      const qtyRaw = col.quantity >= 0 ? row[col.quantity]?.replace(",", ".") : "1";
      const quantity = Number.parseFloat(qtyRaw || "1") || 1;
      const vatRaw = col.vat >= 0 ? Number.parseInt(row[col.vat] ?? "", 10) : NaN;

      parsed.push({
        saleDate,
        receiptNumber: col.receipt >= 0 ? row[col.receipt]?.trim() || undefined : undefined,
        description: col.description >= 0 ? row[col.description]?.trim() || undefined : undefined,
        quantity,
        totalGrossCents,
        vatRate: Number.isNaN(vatRaw) ? 20 : vatRaw,
      });
    }

    if (parsed.length === 0) {
      setParseError("Zo súboru sa nepodarilo prečítať žiadne predaje — skontrolujte formát.");
      return;
    }
    setPreview(parsed);
  };

  return (
    <div className="rounded-[14px] border border-stone-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-stone-900">eKasa — import predajov</h2>
      <p className="mb-4 text-sm text-stone-500">
        Nahrajte CSV export z pokladne. Duplicitné doklady (rovnaké číslo dokladu + dátum) sa
        automaticky preskočia — import možno bezpečne zopakovať.
      </p>

      <div className="mb-4">
        <label className={label}>CSV súbor</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="w-full text-sm text-stone-600 file:mr-3 file:rounded-[10px] file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-stone-800"
        />
      </div>

      {parseError && <p className={errorBox}>{parseError}</p>}

      {preview.length > 0 && (
        <>
          <div className="mb-3 max-h-72 overflow-auto rounded-[10px] border border-stone-200">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-stone-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-stone-500">
                  <th className="px-3 py-2 font-medium">Dátum</th>
                  <th className="px-3 py-2 font-medium">Doklad</th>
                  <th className="px-3 py-2 font-medium">Popis</th>
                  <th className="px-3 py-2 text-right font-medium">Množstvo</th>
                  <th className="px-3 py-2 text-right font-medium">Suma s DPH</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="px-3 py-1.5 text-stone-500">{row.saleDate}</td>
                    <td className="px-3 py-1.5 text-stone-700">{row.receiptNumber ?? "—"}</td>
                    <td className="px-3 py-1.5 text-stone-900">{row.description ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{row.quantity}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatCents(row.totalGrossCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={formAction}>
            <input type="hidden" name="rows" value={JSON.stringify(preview)} />
            <input type="hidden" name="importBatch" value={importBatch} />
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "Importujem…" : `Importovať ${preview.length} predajov`}
            </button>
          </form>
        </>
      )}

      {state.error && <p className={`${errorBox} mt-3`}>{state.error}</p>}
      {state.success && (
        <p className="mt-3 rounded-[10px] bg-[#E7F8E3] px-3 py-2 text-sm text-[#1F7A0F]">{state.success}</p>
      )}
    </div>
  );
}
