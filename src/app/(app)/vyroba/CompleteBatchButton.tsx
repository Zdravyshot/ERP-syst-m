"use client";

import { useActionState } from "react";
import { completeBatch, type BatchFormState } from "./_actions";
import { btnSmallPrimary } from "@/components/ui";

export function CompleteBatchButton({ batchId }: { batchId: string }) {
  const [state, formAction, pending] = useActionState<BatchFormState, FormData>(completeBatch, {});

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="batchId" value={batchId} />
      <button type="submit" disabled={pending} className={btnSmallPrimary}>
        {pending ? "Dokončujem…" : "Dokončiť šaržu"}
      </button>
      {state.error && (
        <span className="ml-2 inline-block max-w-md align-middle text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
