import { test, expect } from "vitest";
import { createPayBySquarePayload } from "./pay-by-square";
import { createInvoicePdfFixture } from "./test-fixtures";

test("PAY by square obsahuje presnú sumu, IBAN, splatnosť a variabilný symbol", async () => {
  const fixture = createInvoicePdfFixture();
  const payload = await createPayBySquarePayload(fixture);

  expect(payload).toBeTruthy();
  const { decode } = await import("bysquare/pay");
  const decoded = decode(payload!);
  expect(decoded.invoiceId).toBe("2026009");
  expect(decoded.payments.length).toBe(1);
  expect(decoded.payments[0]?.amount).toBe(123);
  expect(decoded.payments[0]?.currencyCode).toBe("EUR");
  expect(decoded.payments[0]?.variableSymbol).toBe("2026009");
  expect(decoded.payments[0]?.paymentDueDate).toBe("20260807");
  expect(decoded.payments[0]?.bankAccounts[0]?.iban).toBe("SK9611000000002918599669");
});

test("dobropis a nulová suma nevytvárajú platobný QR kód", async () => {
  expect(
    await createPayBySquarePayload(createInvoicePdfFixture({ documentType: "CREDIT_NOTE" })),
  ).toBeNull();
  expect(await createPayBySquarePayload(createInvoicePdfFixture({ totalGrossCents: 0 }))).toBeNull();
});
