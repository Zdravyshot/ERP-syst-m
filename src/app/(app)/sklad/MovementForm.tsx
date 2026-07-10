"use client";

import { useActionState } from "react";
import { createStockMovement, type MovementFormState } from "./_actions";

interface Item {
  id: string;
  name: string;
  unit: string;
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function MovementForm({ materials, products }: { materials: Item[]; products: Item[] }) {
  const [state, formAction, pending] = useActionState<MovementFormState, FormData>(
    createStockMovement,
    {},
  );

  return (
    <form
      action={formAction}
      className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="lg:col-span-1">
        <label className="mb-1 block text-xs font-medium text-gray-600">Typ pohybu</label>
        <select name="type" required className={inputClass} defaultValue="PRIJEM">
          <option value="PRIJEM">Príjem</option>
          <option value="VYDAJ">Výdaj</option>
          <option value="KOREKCIA">Korekcia</option>
        </select>
      </div>

      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Položka</label>
        <select name="itemRef" required className={inputClass} defaultValue="">
          <option value="" disabled>
            — vyberte —
          </option>
          <optgroup label="Suroviny">
            {materials.map((m) => (
              <option key={m.id} value={`m:${m.id}`}>
                {m.name} ({m.unit})
              </option>
            ))}
          </optgroup>
          <optgroup label="Produkty">
            {products.map((p) => (
              <option key={p.id} value={`p:${p.id}`}>
                {p.name} ({p.unit})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Množstvo</label>
        <input name="quantity" required placeholder="napr. 5 alebo 2,5" className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Cena/jedn. € <span className="text-gray-400">(pri príjme)</span>
        </label>
        <input name="unitPrice" placeholder="napr. 4,50" className={inputClass} />
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Ukladám…" : "Uložiť pohyb"}
        </button>
      </div>

      <div className="sm:col-span-2 lg:col-span-6">
        <label className="mb-1 block text-xs font-medium text-gray-600">Poznámka</label>
        <input name="note" placeholder="napr. dodávka od Bio Farma Šariš" className={inputClass} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 lg:col-span-6">
          {state.error}
        </p>
      )}
    </form>
  );
}
