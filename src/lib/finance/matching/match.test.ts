import { describe, expect, it } from "vitest";
import {
  classifyPayment,
  normalizeIban,
  normalizeVs,
  type InvoiceCandidate,
  type PaymentCandidate,
} from "./match";

const DUE = new Date("2026-07-20");

function invoice(overrides: Partial<InvoiceCandidate> = {}): InvoiceCandidate {
  return {
    invoiceId: "inv-1",
    variableSymbol: "2026009",
    clientIban: "SK3112000000198742637541",
    outstandingCents: 17820,
    currency: "EUR",
    dueDate: DUE,
    ...overrides,
  };
}

function payment(overrides: Partial<PaymentCandidate> = {}): PaymentCandidate {
  return {
    amountCents: 17820,
    currency: "EUR",
    paidAt: new Date("2026-07-18"),
    variableSymbol: "2026009",
    counterpartyIban: "SK3112000000198742637541",
    ...overrides,
  };
}

describe("normalizeVs", () => {
  it("odstráni nečíselné znaky a nuly na začiatku", () => {
    expect(normalizeVs("VS 0002026009")).toBe("2026009");
    expect(normalizeVs("0000")).toBeNull();
    expect(normalizeVs(null)).toBeNull();
  });
});

describe("normalizeIban", () => {
  it("odstráni medzery a zjednotí veľkosť", () => {
    expect(normalizeIban("sk31 1200 0000 1987 4263 7541")).toBe("SK3112000000198742637541");
  });
});

describe("classifyPayment — pravidlo 1 (presný VS + suma + mena)", () => {
  it("spáruje presnú úhradu podľa VS", () => {
    const outcome = classifyPayment(payment(), [invoice()]);
    expect(outcome).toEqual({ type: "AUTO", rule: "EXACT_VS", invoiceId: "inv-1" });
  });

  it("čiastočná úhrada ide na manuálnu kontrolu", () => {
    const outcome = classifyPayment(payment({ amountCents: 10000 }), [invoice()]);
    expect(outcome.type).toBe("MANUAL");
    if (outcome.type === "MANUAL") {
      expect(outcome.reason).toContain("Čiastočná");
      expect(outcome.candidateInvoiceIds).toEqual(["inv-1"]);
    }
  });

  it("nadmerná úhrada ide na manuálnu kontrolu", () => {
    const outcome = classifyPayment(payment({ amountCents: 20000 }), [invoice()]);
    expect(outcome.type).toBe("MANUAL");
    if (outcome.type === "MANUAL") expect(outcome.reason).toContain("Nadmerná");
  });

  it("nejednoznačný VS s rôznymi sumami ide na kontrolu s kandidátmi", () => {
    const outcome = classifyPayment(payment({ amountCents: 5000 }), [
      invoice({ invoiceId: "inv-1", outstandingCents: 17820 }),
      invoice({ invoiceId: "inv-2", outstandingCents: 9900 }),
    ]);
    expect(outcome.type).toBe("MANUAL");
    if (outcome.type === "MANUAL") {
      expect(outcome.candidateInvoiceIds).toContain("inv-1");
      expect(outcome.candidateInvoiceIds).toContain("inv-2");
    }
  });

  it("rovnaký VS na dvoch faktúrach, ale len jedna sedí sumou → AUTO", () => {
    const outcome = classifyPayment(payment({ amountCents: 9900 }), [
      invoice({ invoiceId: "inv-1", outstandingCents: 17820 }),
      invoice({ invoiceId: "inv-2", outstandingCents: 9900 }),
    ]);
    expect(outcome).toEqual({ type: "AUTO", rule: "EXACT_VS", invoiceId: "inv-2" });
  });

  it("mena musí sedieť — iná mena nikdy nepáruje", () => {
    const outcome = classifyPayment(payment({ currency: "CZK" }), [invoice()]);
    expect(outcome.type).toBe("MANUAL");
  });
});

describe("classifyPayment — pravidlo 2 (jednoznačný IBAN + suma + tolerancia dátumu)", () => {
  it("bez VS spáruje podľa jednoznačného IBANu a presnej sumy", () => {
    const outcome = classifyPayment(payment({ variableSymbol: null }), [invoice()]);
    expect(outcome).toEqual({ type: "AUTO", rule: "UNIQUE_IBAN", invoiceId: "inv-1" });
  });

  it("mimo tolerancie dátumu nepáruje", () => {
    const outcome = classifyPayment(
      payment({ variableSymbol: null, paidAt: new Date("2026-09-30") }),
      [invoice()],
    );
    expect(outcome.type).toBe("MANUAL");
  });

  it("dve faktúry rovnakej sumy pre rovnaký IBAN → manuálna kontrola", () => {
    const outcome = classifyPayment(payment({ variableSymbol: null }), [
      invoice({ invoiceId: "inv-1", variableSymbol: "1" }),
      invoice({ invoiceId: "inv-2", variableSymbol: "2" }),
    ]);
    expect(outcome.type).toBe("MANUAL");
    if (outcome.type === "MANUAL") expect(outcome.candidateInvoiceIds).toHaveLength(2);
  });
});

describe("classifyPayment — pravidlo 3 (manuálna kontrola)", () => {
  it("bez VS aj IBAN zhody navrhne kandidátov podľa sumy", () => {
    const outcome = classifyPayment(
      payment({ variableSymbol: "999", counterpartyIban: "SK9911110000001234567890" }),
      [invoice()],
    );
    expect(outcome.type).toBe("MANUAL");
    if (outcome.type === "MANUAL") expect(outcome.candidateInvoiceIds).toEqual(["inv-1"]);
  });

  it("uhradené faktúry (outstanding 0) nie sú kandidátmi", () => {
    const outcome = classifyPayment(payment(), [invoice({ outstandingCents: 0 })]);
    expect(outcome.type).toBe("MANUAL");
    if (outcome.type === "MANUAL") expect(outcome.candidateInvoiceIds).toHaveLength(0);
  });
});
