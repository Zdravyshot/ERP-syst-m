import type {
  BankTransactionResult,
  CreateInvoiceDraftInput,
  PartySnapshot,
  TaxSnapshot,
} from "../contracts";

export const FINANCE_TEST_ACTOR_ID = "test-finance-admin";

export const ISSUER_SNAPSHOT_FIXTURE: PartySnapshot = {
  name: "Testovacia spoločnosť, s. r. o.",
  ico: "00000000",
  dic: "2000000000",
  icDph: "SK2000000000",
  email: "fakturacia@example.test",
  street: "Testovacia 1",
  city: "Bratislava",
  zip: "811 01",
  country: "SK",
  iban: "SK0000000000000000000000",
  bic: "TESTSKBX",
};

export const COUNTERPARTY_SNAPSHOT_FIXTURE: PartySnapshot = {
  name: "Testovací odberateľ, s. r. o.",
  ico: "11111111",
  dic: "2111111111",
  email: "odberatel@example.test",
  street: "Odberateľská 2",
  city: "Žilina",
  zip: "010 01",
  country: "SK",
};

export const TAX_SNAPSHOT_FIXTURE: TaxSnapshot = {
  vatStatus: "PAYER",
  vatRegisteredFrom: new Date("2026-07-01T00:00:00.000Z"),
  domesticTaxMode: "STANDARD",
  deliveryDate: new Date("2026-07-24T00:00:00.000Z"),
};

export const INVOICE_DRAFT_FIXTURE: CreateInvoiceDraftInput = {
  direction: "VYDANA",
  documentType: "INVOICE",
  source: "INTERNA",
  clientId: "test-client",
  counterparty: COUNTERPARTY_SNAPSHOT_FIXTURE,
  issueDate: new Date("2026-07-24T00:00:00.000Z"),
  dueDate: new Date("2026-08-07T00:00:00.000Z"),
  deliveryDate: new Date("2026-07-24T00:00:00.000Z"),
  currency: "EUR",
  items: [
    {
      productId: "test-product",
      productSku: "TEST-001",
      description: "Testovací produkt",
      quantity: 3,
      unit: "ks",
      unitPriceCents: 123,
      vatRate: 23,
      taxCategory: "STANDARD",
    },
  ],
  actorId: FINANCE_TEST_ACTOR_ID,
};

export const BANK_TRANSACTION_FIXTURE: BankTransactionResult = {
  providerTransactionId: "test-transaction-1",
  providerAccountId: "test-account-1",
  status: "BOOKED",
  bookingDate: new Date("2026-07-25T00:00:00.000Z"),
  valueDate: new Date("2026-07-25T00:00:00.000Z"),
  amountCents: 454,
  currency: "EUR",
  counterpartyName: COUNTERPARTY_SNAPSHOT_FIXTURE.name,
  counterpartyIban: "SK1111111111111111111111",
  variableSymbol: "2026009",
  remittanceInfo: "Úhrada faktúry 2026009",
};

export const OMEGA_IMPORT_EXPECTATION = {
  partnerCount: 5,
  issuedInvoiceCount: 8,
  receivedInvoiceCount: 2,
  itemCount: 27,
  issuedTotalGrossCents: 49_870,
  receivedTotalGrossCents: 4_789,
  paidIssuedInvoiceCount: 8,
  firstIssuedNumber: "2026001",
  lastIssuedNumber: "2026008",
  nextIssuedNumber: "2026009",
} as const;
