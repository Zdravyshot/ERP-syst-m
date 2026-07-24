"use client";

import { useActionState } from "react";
import { triggerBankSync, type BankFormState } from "./_actions";
import { btnPrimary, errorBox } from "@/components/ui";

export function SyncButton({ disabled }: { disabled?: boolean }) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(triggerBankSync, {});

  return (
    <div>
      <form action={formAction}>
        <button type="submit" disabled={pending || disabled} className={btnPrimary}>
          {pending ? "Synchronizujem…" : "Synchronizovať teraz"}
        </button>
      </form>
      {state.error && <p className={`${errorBox} mt-3`}>{state.error}</p>}
      {state.success && (
        <p className="mt-3 rounded-[10px] bg-[#E7F8E3] px-3 py-2 text-sm text-[#1F7A0F]">{state.success}</p>
      )}
    </div>
  );
}
