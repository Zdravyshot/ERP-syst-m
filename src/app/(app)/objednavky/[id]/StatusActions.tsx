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
      return "rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50";
    }
    if (status === "EXPEDOVANA") {
      return "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50";
    }
    return "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";
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
      {state.error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>}
    </div>
  );
}
