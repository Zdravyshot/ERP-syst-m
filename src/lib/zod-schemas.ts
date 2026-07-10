import { z } from "zod";

// Povolené hodnoty "enumov" — DB ich nevynucuje (SQLite), stráži ich táto vrstva.

export const unitSchema = z.enum(["ks", "kg", "l", "g", "ml"]);
export const clientTypeSchema = z.enum(["B2B", "B2C"]);
export const orderChannelSchema = z.enum(["MANUAL", "EMAIL", "WEB", "SUBSCRIPTION"]);
export const orderStatusSchema = z.enum(["NOVA", "POTVRDENA", "VO_VYROBE", "EXPEDOVANA", "DORUCENA", "ZRUSENA"]);
export const batchStatusSchema = z.enum(["PLANNED", "DONE", "CANCELLED"]);
export const movementTypeSchema = z.enum(["PRIJEM", "VYDAJ", "VYROBA", "SPOTREBA", "PREDAJ", "KOREKCIA"]);
export const invoiceDirectionSchema = z.enum(["VYDANA", "PRIJATA"]);
export const invoiceSourceSchema = z.enum(["INTERNA", "WEB", "SUPERFAKTURA"]);
export const invoiceStatusSchema = z.enum(["VYSTAVENA", "UHRADENA", "PO_SPLATNOSTI", "STORNO"]);
export const subscriptionFrequencySchema = z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]);
export const inboxSourceSchema = z.enum(["EMAIL", "WEB_FORM", "MANUAL"]);
export const inboxStatusSchema = z.enum(["NOVA", "SPRACOVANA", "IGNOROVANA"]);

export const clientSchema = z.object({
  type: clientTypeSchema,
  name: z.string().min(1, "Meno je povinné"),
  ico: z.string().optional(),
  dic: z.string().optional(),
  icDph: z.string().optional(),
  email: z.string().email("Neplatný e-mail").optional().or(z.literal("")),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  note: z.string().optional(),
});

export const stockMovementSchema = z.object({
  type: movementTypeSchema,
  materialId: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.number().refine((v) => v !== 0, "Množstvo nesmie byť 0"),
  unitPriceCents: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
}).refine(
  (data) => (data.materialId ? !data.productId : !!data.productId),
  "Vyplňte surovinu ALEBO produkt (presne jedno)",
);

// Payload pre POST /api/inbox — objednávky/faktúry z webu a budúce e-maily.
export const inboxPayloadSchema = z.object({
  source: inboxSourceSchema,
  fromEmail: z.string().email().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  rawJson: z.unknown().optional(),
});

export const orderStatusLabels: Record<string, string> = {
  NOVA: "Nová",
  POTVRDENA: "Potvrdená",
  VO_VYROBE: "Vo výrobe",
  EXPEDOVANA: "Expedovaná",
  DORUCENA: "Doručená",
  ZRUSENA: "Zrušená",
};

export const orderChannelLabels: Record<string, string> = {
  MANUAL: "Manuálna",
  EMAIL: "E-mail",
  WEB: "Web",
  SUBSCRIPTION: "Predplatné",
};
