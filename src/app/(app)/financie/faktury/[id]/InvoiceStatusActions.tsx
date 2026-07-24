"use client";

import { useActionState } from "react";
import type { InvoiceFormState } from "../../_actions";
import { btnPrimary, btnDanger, errorBox } from "@/components/ui";

export function InvoiceWorkflowActions({
  documentStatus,
  finalizeAction,
  cancelAction,
}: {
  documentStatus: string;
  finalizeAction: (prevState: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  cancelAction: (prevState: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
}) {
  const [finalizeState, finalizeFormAction, finalizePending] = useActionState(finalizeAction, {});
  const [cancelState, cancelFormAction, cancelPending] = useActionState(cancelAction, {});

  return (
    <div className="space-y-4 print:hidden">
      {documentStatus === "DRAFT" && (
        <form action={finalizeFormAction}>
          <button type="submit" disabled={finalizePending} className={btnPrimary}>
            {finalizePending ? "Finalizujem…" : "Skontrolovať a finalizovať"}
          </button>
          <p className="mt-2 text-xs text-stone-500">
            Finalizácia pridelí číslo, uzamkne údaje a zaradí vytvorenie PDF.
          </p>
        </form>
      )}

      {(documentStatus === "DRAFT" || documentStatus === "ISSUED") && (
        <form action={cancelFormAction} className="space-y-2 border-t border-stone-100 pt-4">
          <label className="block text-xs font-medium text-stone-600" htmlFor="cancel-reason">
            Dôvod storna
          </label>
          <input
            id="cancel-reason"
            name="reason"
            required
            className="w-full rounded-[10px] border border-stone-300 px-3 py-2 text-sm"
          />
          <button type="submit" disabled={cancelPending} className={btnDanger}>
            {cancelPending ? "Stornujem…" : "Stornovať doklad"}
          </button>
        </form>
      )}

      {finalizeState.error && <p className={errorBox}>{finalizeState.error}</p>}
      {cancelState.error && <p className={errorBox}>{cancelState.error}</p>}
      {(finalizeState.success || cancelState.success) && (
        <p className="rounded-[10px] bg-[#E7F8E3] px-3 py-2 text-sm text-[#1F7A0F]">
          {finalizeState.success ?? cancelState.success}
        </p>
      )}
    </div>
  );
}
