// Farebné odznaky pre stavy a typy — jednotný vzhľad naprieč modulmi.

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-800",
  purple: "bg-purple-100 text-purple-800",
  emerald: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-600",
  indigo: "bg-indigo-100 text-indigo-800",
  teal: "bg-teal-100 text-teal-800",
};

export type BadgeColor = keyof typeof COLOR_CLASSES;

export function Badge({ color = "gray", children }: { color?: BadgeColor; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_CLASSES[color] ?? COLOR_CLASSES.gray}`}>
      {children}
    </span>
  );
}

export const ORDER_STATUS_COLORS: Record<string, BadgeColor> = {
  NOVA: "blue",
  POTVRDENA: "amber",
  VO_VYROBE: "purple",
  EXPEDOVANA: "emerald",
  DORUCENA: "gray",
  ZRUSENA: "red",
};

export const INVOICE_STATUS_COLORS: Record<string, BadgeColor> = {
  VYSTAVENA: "blue",
  UHRADENA: "emerald",
  PO_SPLATNOSTI: "red",
  STORNO: "gray",
};

export const CLIENT_TYPE_COLORS: Record<string, BadgeColor> = {
  B2B: "indigo",
  B2C: "teal",
};

export const INBOX_STATUS_COLORS: Record<string, BadgeColor> = {
  NOVA: "blue",
  SPRACOVANA: "emerald",
  IGNOROVANA: "gray",
};
