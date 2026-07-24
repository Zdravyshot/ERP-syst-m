"use client";

import { useActionState } from "react";
import { allocatePaymentAction, reverseAllocationAction, type BankFormState } from "../_actions";
import { btnSmall, btnSmallPrimary, errorBox } from "@/components/ui";

interface InvoiceOption {
  id: string;
  label: string;
  outstandingEur: string;
  suggested: boolean;
}

const inlineInput =
  "rounded-[10px] border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-stone-950 focus:ring-[3px] focus:ring-brand/35";

export function AllocateForm({
  paymentId,
  defaultAmountEur,
  invoices,
}: {
  paymentId: string;
  defaultAmountEur: string;
  invoices: InvoiceOption[];
}) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(
    allocatePaymentAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <select name="invoiceId" required defaultValue={invoices.find((i) => i.suggested)?.id ?? ""} className={`${inlineInput} min-w-64`}>
        <option value="" disabled>
          — vyberte faktúru —
        </option>
        {invoices.map((inv) => (
          <option key={inv.id} value={inv.id}>
            {inv.suggested ? "★ " : ""}
            {inv.label} (zostáva {inv.outstandingEur})
          </option>
        ))}
      </select>
      <input name="amount" defaultValue={defaultAmountEur} className={`${inlineInput} w-28 text-right`} />
      <button type="submit" disabled={pending} className={btnSmallPrimary}>
        {pending ? "Priraďujem…" : "Priradiť"}
      </button>
      {state.error && <span className={`${errorBox} basis-full`}>{state.error}</span>}
      {state.success && (
        <span className="basis-full rounded-[10px] bg-[#E7F8E3] px-3 py-2 text-sm text-[#1F7A0F]">
          {state.success}
        </span>
      )}
    </form>
  );
}

export function ReverseAllocationButton({ allocationId }: { allocationId: string }) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(
    reverseAllocationAction,
    {},
  );

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="allocationId" value={allocationId} />
      <input type="hidden" name="reason" value="Zrušené z manuálnej kontroly" />
      <button type="submit" disabled={pending} className={btnSmall}>
        {pending ? "Ruším…" : "Zrušiť"}
      </button>
      {state.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
