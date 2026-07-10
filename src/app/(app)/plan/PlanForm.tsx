"use client";

import { useActionState } from "react";
import { upsertPlan, type PlanFormState } from "./_actions";
import { MONTH_NAMES_SK } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function PlanForm({ defaultYear, defaultMonth }: { defaultYear: number; defaultMonth: number }) {
  const [state, formAction, pending] = useActionState<PlanFormState, FormData>(upsertPlan, {});

  return (
    <form
      action={formAction}
      className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Rok</label>
        <input name="year" type="number" defaultValue={defaultYear} required className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Mesiac</label>
        <select name="month" defaultValue={defaultMonth} required className={inputClass}>
          {MONTH_NAMES_SK.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Cieľ tržieb €</label>
        <input name="targetRevenue" placeholder="napr. 5000" className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Cieľ výroby (ks)</label>
        <input name="targetProductionUnits" type="number" min="0" placeholder="napr. 2000" className={inputClass} />
      </div>
      <div className="col-span-2 sm:col-span-1">
        <label className="mb-1 block text-xs font-medium text-gray-600">Poznámka</label>
        <input name="note" className={inputClass} />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Ukladám…" : "Uložiť plán"}
        </button>
      </div>
      {state.error && (
        <p className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
    </form>
  );
}
