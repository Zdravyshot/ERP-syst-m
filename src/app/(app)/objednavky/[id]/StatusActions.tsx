"use client";

import { useActionState } from "react";
import { orderStatusLabels } from "@/lib/zod-schemas";
import type { OrderFormState } from "../_actions";

/** Tlačidlá povolených prechodov stavu — expedícia môže zlyhať na nedostatku zásob. */
export function StatusActions({
  allowedStatuses,
  action,
}: {
  allowedStatuses: string[];
  action: (prevState: OrderFormState, formData: FormData) => Promise<OrderFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  if (allowedStatuses.length === 0) return null;

  const buttonClass = (status: string) => {
    if (status === "ZRUSENA") {
      return "rounded-[10px] border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50";
    }
    if (status === "EXPEDOVANA") {
      return "rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-brand-dark disabled:opacity-50";
    }
    return "rounded-[10px] border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50";
  };

  return (
    <div>
      <form action={formAction} className="flex flex-wrap gap-2">
        {allowedStatuses.map((status) => (
          <button key={status} type="submit" name="status" value={status} disabled={pending} className={buttonClass(status)}>
            {status === "EXPEDOVANA" ? "🚚 Expedovať" : `→ ${orderStatusLabels[status] ?? status}`}
          </button>
        ))}
      </form>
      {state.error && <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="mt-3 rounded-[10px] bg-[#E7F8E3] px-3 py-2 text-sm text-[#1F7A0F]">{state.success}</p>}
    </div>
  );
}
