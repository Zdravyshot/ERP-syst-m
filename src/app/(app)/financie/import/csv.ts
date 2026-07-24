// Jednoduchý CSV parser pre importy (beží v prehliadači — preview pred odoslaním).
// Zvláda úvodzovky, oddeľovač ; alebo , alebo tab (autodetekcia z hlavičky).

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", "\t", ","].reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best,
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);

  const [headers = [], ...data] = rows;
  return { headers: headers.map((h) => h.trim()), rows: data };
}

/** lowercase + bez diakritiky — na tolerantné hľadanie stĺpcov */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Nájde index stĺpca podľa kandidátov. Najprv presná zhoda normalizovanej
 * hlavičky, až potom substring — inak by "dph" chytilo aj "suma bez dph".
 */
export function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
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

/** "1 234,56" / "1234.56" → centy */
export function parseAmountToCents(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(/€/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

/** "15.7.2026" / "2026-07-15" / "15.07.2026" → ISO yyyy-mm-dd */
export function parseSkDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const match = trimmed.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return null;
}
