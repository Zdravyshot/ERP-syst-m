import { createHash } from "node:crypto";
import type { BankTransactionResult } from "@/lib/finance/contracts";

/**
 * Dočasný import bankového výpisu (CSV z internet bankingu Tatra banky),
 * kým Tatra Premium API neprejde aktiváciou. Parsovanie je čistá funkcia —
 * zápis do DB rieši sync vrstva rovnako ako pri API synchronizácii.
 */

export interface StatementParseResult {
  transactions: BankTransactionResult[];
  skippedLines: number;
}

function normalize(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalize);
  for (const candidate of candidates) {
    const exact = normalized.findIndex((h) => h === candidate);
    if (exact >= 0) return exact;
  }
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseAmountCents(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(/€|EUR/gi, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : Math.round(parsed * 100);
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return new Date(trimmed.slice(0, 10));
  const match = trimmed.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/);
  if (match) return new Date(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
  return null;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      fields.push(field);
      field = "";
    } else field += ch;
  }
  fields.push(field);
  return fields;
}

/**
 * Deterministické ID transakcie pre výpisy bez referencie — sha256 z kľúčových
 * polí. Rovnaký riadok v opakovanom importe = rovnaké ID = deduplikované
 * databázovou unikátnosťou.
 */
export function statementTransactionId(fields: {
  bookingDate: string;
  amountCents: number;
  variableSymbol?: string;
  counterpartyIban?: string;
  remittanceInfo?: string;
}): string {
  const raw = [
    fields.bookingDate,
    fields.amountCents,
    fields.variableSymbol ?? "",
    fields.counterpartyIban ?? "",
    fields.remittanceInfo ?? "",
  ].join("|");
  return `stmt-${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
}

export function parseStatementCsv(text: string, providerAccountId: string): StatementParseResult {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { transactions: [], skippedLines: 0 };

  const headerLine = lines[0];
  const delimiter = [";", "\t", ","].reduce((best, candidate) =>
    headerLine.split(candidate).length > headerLine.split(best).length ? candidate : best,
  );
  const headers = splitCsvLine(headerLine, delimiter);

  const col = {
    date: findColumn(headers, ["datum zauctovania", "datum", "date"]),
    amount: findColumn(headers, ["suma", "amount", "obrat"]),
    vs: findColumn(headers, ["vs", "variabilny symbol"]),
    ks: findColumn(headers, ["ks", "konstantny symbol"]),
    ss: findColumn(headers, ["ss", "specificky symbol"]),
    iban: findColumn(headers, ["protiucet", "iban protistrany", "ucet protistrany", "iban"]),
    name: findColumn(headers, ["nazov protistrany", "protistrana", "nazov uctu"]),
    info: findColumn(headers, ["popis", "referencia", "sprava", "informacia"]),
    reference: findColumn(headers, ["referencia platby", "id transakcie", "cislo transakcie"]),
  };

  if (col.date < 0 || col.amount < 0) {
    throw new Error(
      `Vo výpise chýbajú povinné stĺpce (dátum, suma). Nájdené hlavičky: ${headers.join(", ")}`,
    );
  }

  const transactions: BankTransactionResult[] = [];
  let skippedLines = 0;

  for (const line of lines.slice(1)) {
    const row = splitCsvLine(line, delimiter);
    const bookingDate = parseDate(row[col.date] ?? "");
    const amountCents = parseAmountCents(row[col.amount] ?? "");
    if (!bookingDate || amountCents === null || amountCents === 0) {
      skippedLines += 1;
      continue;
    }

    const pick = (idx: number) => (idx >= 0 ? row[idx]?.trim() || undefined : undefined);
    const isoDate = bookingDate.toISOString().slice(0, 10);
    const base = {
      bookingDate: isoDate,
      amountCents,
      variableSymbol: pick(col.vs),
      counterpartyIban: pick(col.iban),
      remittanceInfo: pick(col.info),
    };

    transactions.push({
      providerTransactionId: pick(col.reference) ?? statementTransactionId(base),
      providerAccountId,
      status: "BOOKED",
      bookingDate,
      amountCents,
      currency: "EUR",
      counterpartyName: pick(col.name),
      counterpartyIban: base.counterpartyIban,
      variableSymbol: base.variableSymbol,
      constantSymbol: pick(col.ks),
      specificSymbol: pick(col.ss),
      remittanceInfo: base.remittanceInfo,
    });
  }

  return { transactions, skippedLines };
}
