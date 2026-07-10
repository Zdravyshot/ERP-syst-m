// Zdieľané triedy design systému (docs/DESIGN_BRIEF.md + claude.ai/design mocky).
// Používaj tieto konštanty namiesto ad-hoc tried, nech obrazovky ostanú konzistentné.

export const btnPrimary =
  "inline-block rounded-[10px] bg-brand px-4 py-[9px] text-[13.5px] font-semibold text-stone-950 transition hover:bg-brand-dark disabled:opacity-50";

export const btnSecondary =
  "inline-block rounded-[10px] border border-stone-300 bg-white px-4 py-[9px] text-[13.5px] font-semibold text-stone-700 transition hover:bg-stone-50";

export const btnDanger =
  "inline-block rounded-[10px] border border-red-200 bg-white px-4 py-[9px] text-[13.5px] font-semibold text-red-600 transition hover:bg-red-50";

export const btnSmall =
  "rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50";

export const btnSmallPrimary =
  "rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-stone-950 transition hover:bg-brand-dark disabled:opacity-50";

export const btnSmallDanger =
  "rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50";

export const input =
  "w-full rounded-[10px] border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-stone-950 focus:ring-[3px] focus:ring-brand/35";

export const label = "mb-1.5 block text-[13px] font-medium text-stone-700";
export const labelSmall = "mb-1 block text-xs font-medium text-stone-500";

export const card = "rounded-[14px] border border-stone-200 bg-white";
export const cardHeader =
  "border-b border-stone-100 px-[18px] py-[13px] text-[13.5px] font-semibold text-stone-950";

export const table = "w-full border-collapse text-[13.5px]";
export const thead = "text-left text-[11px] uppercase tracking-[0.04em] text-stone-500";
export const th = "px-[18px] py-2 font-medium";
export const thRight = "px-[18px] py-2 text-right font-medium";
export const tr = "border-t border-stone-100";
export const td = "px-[18px] py-[9px] text-stone-950";
export const tdMuted = "px-[18px] py-[9px] text-stone-500";
export const tdRight = "px-[18px] py-[9px] text-right font-medium tabular-nums";
export const tdRightMuted = "px-[18px] py-[9px] text-right tabular-nums text-stone-500";

export const errorBox = "rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700";

export const filterPill = (active: boolean) =>
  `rounded-full px-3 py-1 text-sm transition ${
    active
      ? "bg-stone-950 font-medium text-white"
      : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
  }`;
