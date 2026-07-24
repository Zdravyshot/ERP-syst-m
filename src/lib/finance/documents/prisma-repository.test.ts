import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findUnique: mocks.findUnique,
    },
  },
}));

import { PrismaDocumentRepository } from "./prisma-repository";
import { createInvoicePdfFixture } from "./test-fixtures";

function databaseInvoice(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const fixture = createInvoicePdfFixture();
  return {
    id: fixture.id,
    direction: "VYDANA",
    documentType: fixture.documentType,
    documentStatus: "ISSUED",
    invoiceNumber: fixture.invoiceNumber,
    currency: fixture.currency,
    issueDate: fixture.issueDate,
    dueDate: fixture.dueDate,
    finalizedAt: fixture.finalizedAt,
    variableSymbol: fixture.variableSymbol,
    note: fixture.note,
    issuerSnapshot: fixture.issuer,
    counterpartySnapshot: fixture.counterparty,
    taxSnapshot: fixture.tax,
    totalNetCents: fixture.totalNetCents,
    totalVatCents: fixture.totalVatCents,
    totalGrossCents: fixture.totalGrossCents,
    originalInvoice: null,
    items: fixture.lines.map((line) => ({
      productId: line.productId ?? null,
      productSku: line.productSku ?? null,
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      vatRate: line.vatRate,
      totalNetCents: line.totalNetCents,
      totalVatCents: line.totalVatCents,
      totalGrossCents: line.totalGrossCents,
      taxCategory: line.taxCategory ?? null,
    })),
    ...overrides,
  };
}

beforeEach(() => {
  mocks.findUnique.mockReset();
});

test("dobropis prenesie číslo pôvodnej faktúry do PDF dát", async () => {
  mocks.findUnique.mockResolvedValue(
    databaseInvoice({
      documentType: "CREDIT_NOTE",
      originalInvoice: { invoiceNumber: "2026008" },
    }),
  );

  const data = await new PrismaDocumentRepository().getInvoicePdfData(
    "invoice-test-1",
  );
  expect(data?.originalInvoiceNumber).toBe("2026008");
});

test("dobropis bez čísla pôvodnej faktúry sa odmietne", async () => {
  mocks.findUnique.mockResolvedValue(
    databaseInvoice({ documentType: "CREDIT_NOTE", originalInvoice: null }),
  );

  await expect(
    new PrismaDocumentRepository().getInvoicePdfData("invoice-test-1"),
  ).rejects.toThrow(/pôvodnej faktúry/);
});

test("platiteľovi DPH musí snapshot zachovať IČ DPH", async () => {
  const fixture = createInvoicePdfFixture();
  mocks.findUnique.mockResolvedValue(
    databaseInvoice({
      issuerSnapshot: { ...fixture.issuer, icDph: undefined },
    }),
  );

  await expect(
    new PrismaDocumentRepository().getInvoicePdfData("invoice-test-1"),
  ).rejects.toThrow(/IČ DPH/);
});

test("doklad neplatiteľa nesmie obsahovať vyčíslenú DPH", async () => {
  const fixture = createInvoicePdfFixture();
  mocks.findUnique.mockResolvedValue(
    databaseInvoice({
      issuerSnapshot: { ...fixture.issuer, icDph: undefined },
      taxSnapshot: {
        ...fixture.tax,
        vatStatus: "NON_PAYER",
        vatRegisteredFrom: undefined,
      },
    }),
  );

  await expect(
    new PrismaDocumentRepository().getInvoicePdfData("invoice-test-1"),
  ).rejects.toThrow(/neplatiteľa DPH/);
});
