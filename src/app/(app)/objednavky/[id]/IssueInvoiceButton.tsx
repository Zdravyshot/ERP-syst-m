"use client";

import { useActionState } from "react";
import type { InvoiceFormState } from "../../financie/_actions";
import { btnSmallPrimary } from "@/components/ui";

export function IssueInvoiceButton({
  action,
}: {
  action: (prevState: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className={btnSmallPrimary}>
        {pending ? "Vytváram…" : "Vytvoriť koncept faktúry"}
      </button>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
