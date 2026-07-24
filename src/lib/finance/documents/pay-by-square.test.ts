import assert from "node:assert/strict";
import test from "node:test";
import { createPayBySquarePayload } from "./pay-by-square";
import { createInvoicePdfFixture } from "./test-fixtures";

test("PAY by square obsahuje presnú sumu, IBAN, splatnosť a variabilný symbol", async () => {
  const fixture = createInvoicePdfFixture();
  const payload = await createPayBySquarePayload(fixture);

  assert.ok(payload);
  const { decode } = await import("bysquare/pay");
  const decoded = decode(payload);
  assert.equal(decoded.invoiceId, "2026009");
  assert.equal(decoded.payments.length, 1);
  assert.equal(decoded.payments[0]?.amount, 123);
  assert.equal(decoded.payments[0]?.currencyCode, "EUR");
  assert.equal(decoded.payments[0]?.variableSymbol, "2026009");
  assert.equal(decoded.payments[0]?.paymentDueDate, "20260807");
  assert.equal(
    decoded.payments[0]?.bankAccounts[0]?.iban,
    "SK9611000000002918599669",
  );
});

test("dobropis a nulová suma nevytvárajú platobný QR kód", async () => {
  assert.equal(
    await createPayBySquarePayload(
      createInvoicePdfFixture({ documentType: "CREDIT_NOTE" }),
    ),
    null,
  );
  assert.equal(
    await createPayBySquarePayload(
      createInvoicePdfFixture({ totalGrossCents: 0 }),
    ),
    null,
  );
});
