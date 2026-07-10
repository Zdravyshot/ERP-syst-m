"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatQty, parseEurToCents } from "@/lib/format";

export interface MovementFormState {
  error?: string;
}

/** "1,5" / "1.5" → 1.5 */
function parseQty(value: string): number {
  const parsed = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(parsed) ? NaN : parsed;
}

/**
 * Ručný skladový pohyb: PRIJEM (+), VYDAJ (−), KOREKCIA (so znamienkom).
 * Pohyby VYROBA/SPOTREBA/PREDAJ vznikajú len v moduloch Výroba a Objednávky.
 */
export async function createStockMovement(
  _prev: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const user = await requireUser();

  const type = String(formData.get("type") ?? "");
  const itemRef = String(formData.get("itemRef") ?? "");
  const qtyRaw = String(formData.get("quantity") ?? "");
  const priceRaw = String(formData.get("unitPrice") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!["PRIJEM", "VYDAJ", "KOREKCIA"].includes(type)) {
    return { error: "Neplatný typ pohybu." };
  }
  const [kind, itemId] = itemRef.split(":");
  if ((kind !== "m" && kind !== "p") || !itemId) {
    return { error: "Vyberte surovinu alebo produkt." };
  }

  const qty = parseQty(qtyRaw);
  if (Number.isNaN(qty) || qty === 0) {
    return { error: "Zadajte platné množstvo (nesmie byť 0)." };
  }
  if (qty < 0 && type !== "KOREKCIA") {
    return { error: "Záporné množstvo je povolené len pri korekcii." };
  }

  // PRIJEM: +, VYDAJ: −, KOREKCIA: so znamienkom ako zadané
  const signedQty = type === "VYDAJ" ? -Math.abs(qty) : qty;

  let unitPriceCents: number | null = null;
  if (priceRaw) {
    try {
      unitPriceCents = parseEurToCents(priceRaw);
    } catch {
      return { error: "Neplatná jednotková cena." };
    }
  }

  const isMaterial = kind === "m";
  const where = isMaterial ? { materialId: itemId } : { productId: itemId };

  try {
    await prisma.$transaction(async (tx) => {
      // Kontrola: stav nesmie klesnúť pod nulu
      if (signedQty < 0) {
        const sum = await tx.stockMovement.aggregate({ where, _sum: { quantity: true } });
        const current = sum._sum.quantity ?? 0;
        if (current + signedQty < 0) {
          throw new Error(
            `Nedostatočná zásoba: na sklade je ${formatQty(current)}, požadovaný výdaj ${formatQty(Math.abs(signedQty))}.`,
          );
        }
      }

      await tx.stockMovement.create({
        data: {
          type,
          ...(isMaterial ? { materialId: itemId } : { productId: itemId }),
          quantity: signedQty,
          unitPriceCents,
          note,
          createdById: user.userId,
        },
      });

      // Príjem suroviny s cenou aktualizuje poslednú nákupnú cenu (vstup pre marže)
      if (isMaterial && type === "PRIJEM" && unitPriceCents !== null) {
        await tx.material.update({ where: { id: itemId }, data: { lastPriceCents: unitPriceCents } });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Pohyb sa nepodarilo uložiť." };
  }

  revalidatePath("/sklad");
  revalidatePath("/sklad/pohyby");
  redirect("/sklad/pohyby");
}
