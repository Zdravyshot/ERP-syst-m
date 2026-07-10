// Konštanty modulu Objednávky (frekvencie predplatného a povolené prechody stavov).
// Slovenské labels pre stavy/kanály objednávok sú v src/lib/zod-schemas.ts.

export const SUBSCRIPTION_FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Týždenne",
  BIWEEKLY: "Každé 2 týždne",
  MONTHLY: "Mesačne",
};

export const INBOX_SOURCE_LABELS: Record<string, string> = {
  EMAIL: "E-mail",
  WEB_FORM: "Webový formulár",
  MANUAL: "Manuálne",
};

export const INBOX_STATUS_LABELS: Record<string, string> = {
  NOVA: "Nová",
  SPRACOVANA: "Spracovaná",
  IGNOROVANA: "Ignorovaná",
};

/** Povolené prechody stavov objednávky. Expedícia vytvára skladové pohyby PREDAJ. */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  NOVA: ["POTVRDENA", "ZRUSENA"],
  POTVRDENA: ["VO_VYROBE", "EXPEDOVANA", "ZRUSENA"],
  VO_VYROBE: ["EXPEDOVANA", "ZRUSENA"],
  EXPEDOVANA: ["DORUCENA"],
  DORUCENA: [],
  ZRUSENA: [],
};

/** Objednávku možno upravovať, len kým nie je vo výrobe/expedovaná/uzavretá. */
export const EDITABLE_ORDER_STATUSES = ["NOVA", "POTVRDENA"];
