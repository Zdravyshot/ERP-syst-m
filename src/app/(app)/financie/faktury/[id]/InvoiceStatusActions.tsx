"use client";

import { useActionState } from "react";
import type { InvoiceFormState } from "../../_actions";
import { btnPrimary, btnDanger, errorBox } from "@/components/ui";

export function InvoiceStatusActions({
  action,
}: {
  action: (prevState: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="print:hidden">
      <form action={formAction} className="flex flex-wrap gap-2">
        <button type="submit" name="status" value="UHRADENA" disabled={pending} className={btnPrimary}>
          ✓ Označiť ako uhradenú
        </button>
        <button type="submit" name="status" value="STORNO" disabled={pending} className={btnDanger}>
          Stornovať
        </button>
      </form>
      {state.error && <p className={`${errorBox} mt-3`}>{state.error}</p>}
      {state.success && (
        <p className="mt-3 rounded-[10px] bg-[#E7F8E3] px-3 py-2 text-sm text-[#1F7A0F]">{state.success}</p>
      )}
    </div>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-[10px] border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 print:hidden"
    >
      🖨 Tlačiť
    </button>
  );
}
