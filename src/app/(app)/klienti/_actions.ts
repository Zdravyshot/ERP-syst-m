"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hasFinancePermission } from "@/lib/finance/permissions";
import { clientSchema } from "@/lib/zod-schemas";

export interface ClientFormState {
  error?: string;
}

function parseClientForm(formData: FormData) {
  const raw = {
    type: String(formData.get("type") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    ico: String(formData.get("ico") ?? "").trim() || undefined,
    dic: String(formData.get("dic") ?? "").trim() || undefined,
    icDph: String(formData.get("icDph") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    iban: String(formData.get("iban") ?? "").trim() || undefined,
    street: String(formData.get("street") ?? "").trim() || undefined,
    city: String(formData.get("city") ?? "").trim() || undefined,
    zip: String(formData.get("zip") ?? "").trim() || undefined,
    note: String(formData.get("note") ?? "").trim() || undefined,
  };
  return clientSchema.safeParse(raw);
}

function toDbData(data: z.infer<typeof clientSchema>, includeIban: boolean) {
  return {
    type: data.type,
    name: data.name,
    ico: data.ico ?? null,
    dic: data.dic ?? null,
    icDph: data.icDph ?? null,
    email: data.email || null,
    phone: data.phone ?? null,
    ...(includeIban ? { iban: data.iban ?? null } : {}),
    street: data.street ?? null,
    city: data.city ?? null,
    zip: data.zip ?? null,
    note: data.note ?? null,
  };
}

export async function createClient(_prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const user = await requireUser();
  const canEditFinance = hasFinancePermission(user.role, "CONFIGURE");
  if (parsed.data.iban && !canEditFinance) {
    return { error: "IBAN klienta môže meniť iba finančný administrátor." };
  }

  const client = await prisma.client.create({ data: toDbData(parsed.data, canEditFinance) });

  revalidatePath("/klienti");
  redirect(`/klienti/${client.id}`);
}

export async function updateClient(clientId: string, _prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neplatné údaje." };
  }
  const user = await requireUser();
  const canEditFinance = hasFinancePermission(user.role, "CONFIGURE");
  if (parsed.data.iban && !canEditFinance) {
    return { error: "IBAN klienta môže meniť iba finančný administrátor." };
  }

  const existing = await prisma.client.findUnique({ where: { id: clientId } });
  if (!existing) return { error: "Klient neexistuje." };

  await prisma.client.update({
    where: { id: clientId },
    data: toDbData(parsed.data, canEditFinance),
  });

  revalidatePath("/klienti");
  revalidatePath(`/klienti/${clientId}`);
  redirect(`/klienti/${clientId}`);
}

export async function toggleClientActive(clientId: string): Promise<void> {
  await requireUser();
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return;
  await prisma.client.update({ where: { id: clientId }, data: { isActive: !client.isActive } });
  revalidatePath("/klienti");
  revalidatePath(`/klienti/${clientId}`);
}
