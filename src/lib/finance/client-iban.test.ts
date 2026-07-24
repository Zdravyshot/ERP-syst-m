import { expect, test } from "vitest";
import { clientSchema } from "@/lib/zod-schemas";

const validClient = {
  type: "B2B",
  name: "Odberateľ, s. r. o.",
  email: "",
};

test("IBAN klienta sa pred uložením normalizuje", () => {
  const parsed = clientSchema.parse({
    ...validClient,
    iban: "sk31 1200 0000 1987 4263 7541",
  });

  expect(parsed.iban).toBe("SK3112000000198742637541");
});

test("neplatný formát IBAN klienta sa odmietne", () => {
  const parsed = clientSchema.safeParse({
    ...validClient,
    iban: "SK123",
  });

  expect(parsed.success).toBe(false);
});
