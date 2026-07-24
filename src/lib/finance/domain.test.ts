import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDocumentTransition,
  calculateInvoice,
  calculatePaymentStatus,
  canTransitionDocument,
  FinanceDomainError,
  formatDocumentNumber,
  isDateWithinValidity,
} from "./domain";
import { hasFinancePermission } from "./permissions";
import { evaluateProductionIssuingInfrastructure } from "./invoice-service";

test("DPH sa zaokrúhľuje po jednotlivých položkách", () => {
  const result = calculateInvoice({
    currency: "EUR",
    lines: [
      { description: "A", quantity: 1, unit: "ks", unitPriceCents: 2, vatRate: 23 },
      { description: "B", quantity: 1, unit: "ks", unitPriceCents: 2, vatRate: 23 },
      { description: "C", quantity: 3, unit: "ks", unitPriceCents: 123, vatRate: 23 },
    ],
  });

  assert.deepEqual(
    result.lines.map((line) => line.totalVatCents),
    [0, 0, 85],
  );
  assert.equal(result.totalNetCents, 373);
  assert.equal(result.totalVatCents, 85);
  assert.equal(result.totalGrossCents, 458);
});

test("oslobodená položka nemôže niesť nenulovú DPH", () => {
  assert.throws(
    () =>
      calculateInvoice({
        currency: "EUR",
        lines: [
          {
            description: "Oslobodená služba",
            quantity: 1,
            unit: "ks",
            unitPriceCents: 100,
            vatRate: 23,
            taxCategory: "EXEMPT",
          },
        ],
      }),
    (error) => error instanceof FinanceDomainError && error.code === "INVALID_LINE",
  );
});

test("stav úhrady sa počíta výhradne zo sumy aktívnych alokácií", () => {
  assert.equal(calculatePaymentStatus(1_000, 0), "UNPAID");
  assert.equal(calculatePaymentStatus(1_000, 400), "PARTIALLY_PAID");
  assert.equal(calculatePaymentStatus(1_000, 1_000), "PAID");
  assert.equal(calculatePaymentStatus(1_000, 1_001), "OVERPAID");
});

test("povolené prechody chránia nemennosť finalizovaného dokladu", () => {
  assert.equal(canTransitionDocument("DRAFT", "ISSUED"), true);
  assert.equal(canTransitionDocument("ISSUED", "DRAFT"), false);
  assert.equal(canTransitionDocument("CANCELLED", "ISSUED"), false);
  assert.throws(() => assertDocumentTransition("ISSUED", "DRAFT"), FinanceDomainError);
});

test("časová platnosť je na oboch hraniciach inkluzívna", () => {
  const from = new Date("2026-07-01T00:00:00.000Z");
  const to = new Date("2026-07-31T23:59:59.999Z");
  assert.equal(isDateWithinValidity(from, from, to), true);
  assert.equal(isDateWithinValidity(to, from, to), true);
  assert.equal(isDateWithinValidity(new Date("2026-08-01T00:00:00.000Z"), from, to), false);
});

test("oficiálny rad vydaných faktúr pokračuje číslom 2026009", () => {
  assert.equal(formatDocumentNumber("VYDANA", 2026, 9), "2026009");
  assert.equal(formatDocumentNumber("PRIJATA", 2026, 9), "PF2026009");
});

test("finančný operátor nemôže finalizovať ani meniť daňové nastavenia", () => {
  assert.equal(hasFinancePermission("FINANCE_OPERATOR", "VIEW"), true);
  assert.equal(hasFinancePermission("FINANCE_OPERATOR", "CREATE_DRAFT"), true);
  assert.equal(hasFinancePermission("FINANCE_OPERATOR", "FINALIZE"), false);
  assert.equal(hasFinancePermission("FINANCE_OPERATOR", "CONFIGURE"), false);
  assert.equal(hasFinancePermission("admin", "FINALIZE"), true);
  assert.equal(hasFinancePermission("user", "VIEW"), false);
});

test("produkčná infraštruktúra je fail-closed", () => {
  const blocked = evaluateProductionIssuingInfrastructure({ NODE_ENV: "production" });
  assert.equal(blocked.ready, false);
  assert.ok(blocked.blockers.length >= 4);

  const ready = evaluateProductionIssuingInfrastructure({
    NODE_ENV: "production",
    FINANCE_PRODUCTION_ISSUING_ENABLED: "true",
    FINANCE_BUCKET_NAME: "finance-private",
    FINANCE_MAIL_PROVIDER: "transactional-provider",
    FINANCE_MAIL_FROM: "info@zdravyshot.sk",
  });
  assert.deepEqual(ready, { ready: true, blockers: [] });
});
