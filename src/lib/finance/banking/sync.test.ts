import { describe, expect, it } from "vitest";
import { decideTransactionPersistence } from "./sync";

describe("idempotencia bankovej synchronizácie", () => {
  it("novú transakciu vytvorí", () => {
    expect(decideTransactionPersistence(null, "BOOKED")).toBe("CREATE_TRANSACTION");
  });

  it("rovnakú zaúčtovanú transakciu označí ako duplikát", () => {
    expect(
      decideTransactionPersistence({ status: "BOOKED", hasPayment: true }, "BOOKED"),
    ).toBe("DUPLICATE");
  });

  it("PENDING transakciu povýši na BOOKED a umožní vytvorenie platby", () => {
    expect(
      decideTransactionPersistence({ status: "PENDING", hasPayment: false }, "BOOKED"),
    ).toBe("PROMOTE_TO_BOOKED");
  });

  it("opraví BOOKED transakciu, ktorej chýba platba", () => {
    expect(
      decideTransactionPersistence({ status: "BOOKED", hasPayment: false }, "BOOKED"),
    ).toBe("CREATE_MISSING_PAYMENT");
  });

  it("BOOKED transakciu nikdy nezníži späť na PENDING", () => {
    expect(
      decideTransactionPersistence({ status: "BOOKED", hasPayment: true }, "PENDING"),
    ).toBe("DUPLICATE");
  });
});
