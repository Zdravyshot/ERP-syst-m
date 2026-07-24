"use client";

import { useState } from "react";
import { useActionState } from "react";
import { importSuperfakturaRows, type InvoiceFormState } from "../_actions";
import { formatCents } from "@/lib/format";
import { btnPrimary, errorBox, input, label } from "@/components/ui";
import { findColumn, parseAmountToCents, parseCsv, parseSkDate } from "./csv";

interface PreviewRow {
  externalId: string;
  externalNumber?: string;
  direction: "VYDANA" | "PRIJATA";
  clientName: string;
  clientIco?: string;
  clientEmail?: string;
  issueDate: string;
  dueDate: string;
  variableSymbol?: string;
  netCents: number;
  vatRate: number;
  paid?: boolean;
}

export function SuperfakturaImport() {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(
    importSuperfakturaRows,
    {},
  );
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"VYDANA" | "PRIJATA">("VYDANA");

  const handleFile = async (file: File | undefined, dir: "VYDANA" | "PRIJATA") => {
    setPreview([]);
    setParseError(null);
    if (!file) return;

    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (rows.length === 0) {
      setParseError("Súbor neobsahuje žiadne riadky.");
      return;
    }

    const col = {
      id: findColumn(headers, ["id"]),
      number: findColumn(headers, ["cislo fakt", "cislo", "invoice"]),
      client: findColumn(headers, ["odberatel", "klient", "dodavatel", "firma", "meno"]),
      ico: findColumn(headers, ["ico"]),
      email: findColumn(headers, ["email", "e-mail"]),
      issued: findColumn(headers, ["vystaven", "datum vystav", "created"]),
      due: findColumn(headers, ["splatn"]),
      vs: findColumn(headers, ["variabiln", "vs"]),
      net: findColumn(headers, ["bez dph", "zaklad", "netto"]),
      vat: findColumn(headers, ["dph"]),
      gross: findColumn(headers, ["s dph", "spolu", "celkom", "suma"]),
      paid: findColumn(headers, ["uhraden", "zaplaten"]),
    };

    if (col.number < 0 || col.client < 0 || col.issued < 0) {
      setParseError(
        `V CSV chýbajú povinné stĺpce (číslo faktúry, odberateľ, dátum vystavenia). Nájdené hlavičky: ${headers.join(", ")}`,
      );
      return;
    }

    const parsed: PreviewRow[] = [];
    for (const row of rows) {
      const number = row[col.number]?.trim();
      const clientName = row[col.client]?.trim();
      const issueDate = parseSkDate(row[col.issued] ?? "");
      if (!number || !clientName || !issueDate) continue;

      let netCents = col.net >= 0 ? parseAmountToCents(row[col.net] ?? "") : null;
      const vatCents = col.vat >= 0 ? parseAmountToCents(row[col.vat] ?? "") : null;
      const grossCents = col.gross >= 0 ? parseAmountToCents(row[col.gross] ?? "") : null;
      if (netCents === null && grossCents !== null && vatCents !== null) {
        netCents = grossCents - vatCents;
      }
      if (netCents === null) continue;

      const vatRate =
        netCents > 0 && vatCents !== null ? Math.round((vatCents / netCents) * 100) : 20;

      const paidRaw = col.paid >= 0 ? (row[col.paid] ?? "").toLowerCase() : "";

      parsed.push({
        externalId: col.id >= 0 && row[col.id]?.trim() ? row[col.id].trim() : number,
        externalNumber: number,
        direction: dir,
        clientName,
        clientIco: col.ico >= 0 ? row[col.ico]?.trim() || undefined : undefined,
        clientEmail: col.email >= 0 ? row[col.email]?.trim() || undefined : undefined,
        issueDate,
        dueDate: (col.due >= 0 ? parseSkDate(row[col.due] ?? "") : null) ?? issueDate,
        variableSymbol: col.vs >= 0 ? row[col.vs]?.trim() || undefined : undefined,
        netCents,
        vatRate,
        paid: ["ano", "áno", "yes", "1", "true", "uhradena", "uhradená"].includes(paidRaw),
      });
    }

    if (parsed.length === 0) {
      setParseError("Zo súboru sa nepodarilo prečítať žiadnu faktúru — skontrolujte formát.");
      return;
    }
    setPreview(parsed);
  };

  return (
    <div className="rounded-[14px] border border-stone-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-stone-900">SuperFaktúra — import faktúr</h2>
      <p className="mb-4 text-sm text-stone-500">
        Nahrajte CSV export zo SuperFaktúry. Import je idempotentný — už importované faktúry sa
        preskočia, každá dostane jednotné interné číslo.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Smer faktúr v súbore</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "VYDANA" | "PRIJATA")}
            className={input}
          >
            <option value="VYDANA">Vydané faktúry</option>
            <option value="PRIJATA">Prijaté faktúry (náklady)</option>
          </select>
        </div>
        <div>
          <label className={label}>CSV súbor</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0], direction)}
            className="w-full text-sm text-stone-600 file:mr-3 file:rounded-[10px] file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-stone-800"
          />
        </div>
      </div>

      {parseError && <p className={errorBox}>{parseError}</p>}

      {preview.length > 0 && (
        <>
          <div className="mb-3 max-h-72 overflow-auto rounded-[10px] border border-stone-200">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-stone-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-stone-500">
                  <th className="px-3 py-2 font-medium">Číslo</th>
                  <th className="px-3 py-2 font-medium">Klient</th>
                  <th className="px-3 py-2 font-medium">Vystavená</th>
                  <th className="px-3 py-2 text-right font-medium">Základ</th>
                  <th className="px-3 py-2 text-right font-medium">DPH %</th>
                  <th className="px-3 py-2 font-medium">Uhradená</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="px-3 py-1.5 font-medium text-stone-900">{row.externalNumber}</td>
                    <td className="px-3 py-1.5 text-stone-700">{row.clientName}</td>
                    <td className="px-3 py-1.5 text-stone-500">{row.issueDate}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCents(row.netCents)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{row.vatRate} %</td>
                    <td className="px-3 py-1.5">{row.paid ? "áno" : "nie"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={formAction}>
            <input type="hidden" name="rows" value={JSON.stringify(preview)} />
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "Importujem…" : `Importovať ${preview.length} faktúr`}
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
