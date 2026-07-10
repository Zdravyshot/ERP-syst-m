"use client";

import { useActionState } from "react";
import { createBatch, type BatchFormState } from "./_actions";

interface ProductOption {
  id: string;
  name: string;
  shelfLifeDays: number;
  hasRecipe: boolean;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function BatchForm({ products, today }: { products: ProductOption[]; today: string }) {
  const [state, formAction, pending] = useActionState<BatchFormState, FormData>(createBatch, {});

  return (
    <form
      action={formAction}
      className="max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-6"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Produkt</label>
        <select name="productId" required className={inputClass} defaultValue="">
          <option value="" disabled>
            — vyberte produkt —
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.hasRecipe ? "" : " (bez receptúry!)"}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Produkt bez receptúry sa nedá dokončiť — receptúru vytvoríte v sekcii Receptúry.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Počet kusov</label>
          <input name="producedQty" type="number" min="1" required placeholder="100" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Dátum výroby</label>
          <input name="productionDate" type="date" defaultValue={today} required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Exspirácia <span className="font-normal text-gray-400">(inak auto)</span>
          </label>
          <input name="expiryDate" type="date" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Poznámka</label>
        <input name="note" className={inputClass} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
        {pending ? "Ukladám…" : "Vytvoriť šaržu"}
      </button>
    </form>
  );
}
