"use client";

import { useActionState } from "react";
import { upsertPlan, type PlanFormState } from "./_actions";
import { MONTH_NAMES_SK } from "@/lib/format";
import { errorBox, input, labelSmall } from "@/components/ui";

export function PlanForm({ defaultYear, defaultMonth }: { defaultYear: number; defaultMonth: number }) {
  const [state, formAction, pending] = useActionState<PlanFormState, FormData>(upsertPlan, {});

  return (
    <form
      action={formAction}
      className="mb-6 grid grid-cols-2 gap-3 rounded-[14px] border border-stone-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <div>
        <label className={labelSmall}>Rok</label>
        <input name="year" type="number" defaultValue={defaultYear} required className={input} />
      </div>
      <div>
        <label className={labelSmall}>Mesiac</label>
        <select name="month" defaultValue={defaultMonth} required className={input}>
          {MONTH_NAMES_SK.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelSmall}>Cieľ tržieb €</label>
        <input name="targetRevenue" placeholder="napr. 5000" className={input} />
      </div>
      <div>
        <label className={labelSmall}>Cieľ výroby (ks)</label>
        <input name="targetProductionUnits" type="number" min="0" placeholder="napr. 2000" className={input} />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className={labelSmall}>Poznámka</label>
        <input name="note" className={input} />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[10px] bg-brand px-4 py-[9px] text-[13.5px] font-semibold text-stone-950 transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Ukladám…" : "Uložiť plán"}
        </button>
      </div>
      {state.error && <p className={`${errorBox} col-span-full`}>{state.error}</p>}
    </form>
  );
}
