"use client";

import { useActionState } from "react";
import { completeBatch, type BatchFormState } from "./_actions";

export function CompleteBatchButton({ batchId }: { batchId: string }) {
  const [state, formAction, pending] = useActionState<BatchFormState, FormData>(completeBatch, {});

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="batchId" value={batchId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
        {pending ? "Dokončujem…" : "Dokončiť šaržu"}
      </button>
      {state.error && (
        <span className="ml-2 inline-block max-w-md align-middle text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
