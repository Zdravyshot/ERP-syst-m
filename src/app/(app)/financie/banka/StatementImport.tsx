"use client";

import { useState } from "react";
import { useActionState } from "react";
import { importStatement, type BankFormState } from "./_actions";
import { formatCents } from "@/lib/format";
import { btnPrimary, errorBox, input, label } from "@/components/ui";

interface PreviewTxn {
  providerTransactionId: string;
  providerAccountId: string;
  status: "PENDING" | "BOOKED";
  bookingDate: string;
  amountCents: number;
  currency: "EUR";
  counterpartyName?: string;
  counterpartyIban?: string;
  variableSymbol?: string;
  remittanceInfo?: string;
}

export function StatementImport({
  parseAction,
}: {
  parseAction: (text: string, iban: string) => Promise<{ transactions: PreviewTxn[]; skippedLines: number } | { error: string }>;
}) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(importStatement, {});
  const [preview, setPreview] = useState<PreviewTxn[]>([]);
  const [iban, setIban] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(0);

  const handleFile = async (file: File | undefined) => {
    setPreview([]);
    setParseError(null);
    if (!file) return;
    if (!iban.trim()) {
      setParseError("Najprv zadajte IBAN účtu, ku ktorému výpis patrí.");
      return;
    }
    if (file.size > 5_000_000) {
      setParseError("Výpis je príliš veľký. Maximálna veľkosť je 5 MB.");
      return;
    }
    const text = await file.text();
    const result = await parseAction(text, iban.trim());
    if ("error" in result) {
      setParseError(result.error);
      return;
    }
    if (result.transactions.length === 0) {
      setParseError("Z výpisu sa nepodarilo prečítať žiadne transakcie.");
      return;
    }
    setPreview(result.transactions);
    setSkipped(result.skippedLines);
  };

  return (
    <div className="rounded-[14px] border border-stone-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-stone-900">Import bankového výpisu</h2>
      <p className="mb-4 text-sm text-stone-500">
        Dočasné riešenie, kým sa aktivuje Tatra Premium API. Opakovaný import toho istého výpisu
        nevytvorí duplikáty. Nové prijaté platby sa hneď automaticky párujú na faktúry.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>IBAN účtu</label>
          <input
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="SK00 0000 0000 0000 0000 0000"
            className={input}
          />
        </div>
        <div>
          <label className={label}>CSV výpis</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0])}
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
                  <th className="px-3 py-2 font-medium">Dátum</th>
                  <th className="px-3 py-2 text-right font-medium">Suma</th>
                  <th className="px-3 py-2 font-medium">VS</th>
                  <th className="px-3 py-2 font-medium">Protistrana</th>
                  <th className="px-3 py-2 font-medium">Popis</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((txn) => (
                  <tr key={txn.providerTransactionId} className="border-t border-stone-100">
                    <td className="px-3 py-1.5 text-stone-500">{txn.bookingDate.slice(0, 10)}</td>
                    <td
                      className={`px-3 py-1.5 text-right font-medium tabular-nums ${
                        txn.amountCents < 0 ? "text-[#B91C1C]" : "text-[#1F7A0F]"
                      }`}
                    >
                      {txn.amountCents > 0 ? "+" : ""}
                      {formatCents(txn.amountCents)}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-stone-700">{txn.variableSymbol ?? "—"}</td>
                    <td className="px-3 py-1.5 text-stone-700">{txn.counterpartyName ?? txn.counterpartyIban ?? "—"}</td>
                    <td className="max-w-48 truncate px-3 py-1.5 text-stone-500">{txn.remittanceInfo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {skipped > 0 && (
            <p className="mb-2 text-xs text-stone-400">Preskočených nečitateľných riadkov: {skipped}</p>
          )}

          <form action={formAction}>
            <input type="hidden" name="iban" value={iban} />
            <input type="hidden" name="rows" value={JSON.stringify(preview)} />
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "Importujem…" : `Importovať ${preview.length} transakcií`}
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
