"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseEurToCents } from "@/lib/format";

export interface PlanFormState {
  error?: string;
}

export async function upsertPlan(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  await requireUser();

  const year = Number.parseInt(String(formData.get("year") ?? ""), 10);
  const month = Number.parseInt(String(formData.get("month") ?? ""), 10);
  const revenueRaw = String(formData.get("targetRevenue") ?? "").trim();
  const unitsRaw = String(formData.get("targetProductionUnits") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!Number.isInteger(year) || year < 2020 || year > 2100) return { error: "Neplatný rok." };
  if (!Number.isInteger(month) || month < 1 || month > 12) return { error: "Neplatný mesiac." };

  let targetRevenueCents = 0;
  if (revenueRaw) {
    try {
      targetRevenueCents = parseEurToCents(revenueRaw);
    } catch {
      return { error: "Neplatná cieľová suma tržieb." };
    }
  }
  const targetProductionUnits = unitsRaw ? Number.parseInt(unitsRaw, 10) : 0;
  if (Number.isNaN(targetProductionUnits) || targetProductionUnits < 0) {
    return { error: "Neplatný cieľ výroby." };
  }

  await prisma.monthlyPlan.upsert({
    where: { year_month: { year, month } },
    create: { year, month, targetRevenueCents, targetProductionUnits, note },
    update: { targetRevenueCents, targetProductionUnits, note },
  });

  revalidatePath("/plan");
  revalidatePath("/");
  redirect("/plan");
}
