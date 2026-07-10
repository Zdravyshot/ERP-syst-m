// Farebné odznaky pre stavy a typy — jednotný vzhľad naprieč modulmi.

// Paleta podľa docs/DESIGN_BRIEF.md: zelená = pozitívne, žltá = rozpracované,
// červená = problém, sivá = neutrálne (stone tóny z dizajnu).
const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-[#FFF6D2] text-[#8A6200]",
  amber: "bg-[#FFF6D2] text-[#8A6200]",
  purple: "bg-[#FFF6D2] text-[#8A6200]",
  yellow: "bg-[#FFF6D2] text-[#8A6200]",
  emerald: "bg-[#E7F8E3] text-[#1F7A0F]",
  red: "bg-[#FEE2E2] text-[#B91C1C]",
  gray: "bg-stone-100 text-stone-600",
  indigo: "bg-stone-950 text-white",
  teal: "bg-stone-100 text-stone-600",
};

export type BadgeColor = keyof typeof COLOR_CLASSES;

export function Badge({ color = "gray", children }: { color?: BadgeColor; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-[9px] py-0.5 text-[11px] font-semibold ${COLOR_CLASSES[color] ?? COLOR_CLASSES.gray}`}>
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
