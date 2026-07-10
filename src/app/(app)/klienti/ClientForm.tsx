"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ClientFormState } from "./_actions";

export interface ClientFormValues {
  type: string;
  name: string;
  ico: string;
  dic: string;
  icDph: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  note: string;
}

const EMPTY: ClientFormValues = {
  type: "B2B",
  name: "",
  ico: "",
  dic: "",
  icDph: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  zip: "",
  note: "",
};

const inputClass =
  "w-full rounded-[10px] border border-stone-300 px-3 py-2 text-sm focus:border-stone-950 focus:outline-none focus:ring-[3px] focus:ring-brand/35";
const labelClass = "mb-1 block text-sm font-medium text-stone-700";

export function ClientForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prevState: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  initial?: Partial<ClientFormValues>;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = { ...EMPTY, ...initial };
  const [type, setType] = useState(values.type);

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-[14px] border border-stone-200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="type" className={labelClass}>Typ klienta</label>
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            <option value="B2B">B2B — firma</option>
            <option value="B2C">B2C — koncový zákazník</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="name" className={labelClass}>Meno / názov *</label>
          <input id="name" name="name" required defaultValue={values.name} className={inputClass} placeholder="Fitko Havran s.r.o." />
        </div>
      </div>

      {type === "B2B" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ico" className={labelClass}>IČO</label>
            <input id="ico" name="ico" defaultValue={values.ico} className={inputClass} />
          </div>
          <div>
            <label htmlFor="dic" className={labelClass}>DIČ</label>
            <input id="dic" name="dic" defaultValue={values.dic} className={inputClass} />
          </div>
          <div>
            <label htmlFor="icDph" className={labelClass}>IČ DPH</label>
            <input id="icDph" name="icDph" defaultValue={values.icDph} className={inputClass} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>E-mail</label>
          <input id="email" name="email" type="email" defaultValue={values.email} className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>Telefón</label>
          <input id="phone" name="phone" defaultValue={values.phone} className={inputClass} placeholder="+421 9xx xxx xxx" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="street" className={labelClass}>Ulica a číslo</label>
          <input id="street" name="street" defaultValue={values.street} className={inputClass} />
        </div>
        <div>
          <label htmlFor="city" className={labelClass}>Mesto</label>
          <input id="city" name="city" defaultValue={values.city} className={inputClass} />
        </div>
        <div>
          <label htmlFor="zip" className={labelClass}>PSČ</label>
          <input id="zip" name="zip" defaultValue={values.zip} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="note" className={labelClass}>Poznámka</label>
        <textarea id="note" name="note" rows={3} defaultValue={values.note} className={inputClass} />
      </div>

      {state.error && (
        <p className="rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Ukladám…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-[10px] border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Zrušiť
        </Link>
      </div>
    </form>
  );
}
