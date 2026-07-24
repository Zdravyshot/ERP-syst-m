-- Finance v2 bootstrap.
-- This migration is intentionally additive: Invoice.status remains as a legacy
-- compatibility field until the A1 workflow migration moves the UI to
-- documentStatus and allocation-derived payment status.

-- AlterTable
ALTER TABLE "Invoice"
    ALTER COLUMN "invoiceNumber" DROP NOT NULL,
    ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'INVOICE',
    ADD COLUMN "documentStatus" TEXT NOT NULL DEFAULT 'ISSUED',
    ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR',
    ADD COLUMN "originalInvoiceId" TEXT,
    ADD COLUMN "finalizedAt" TIMESTAMP(3),
    ADD COLUMN "cancelledAt" TIMESTAMP(3),
    ADD COLUMN "cancelReason" TEXT,
    ADD COLUMN "createdById" TEXT,
    ADD COLUMN "finalizedById" TEXT,
    ADD COLUMN "cancelledById" TEXT,
    ADD COLUMN "issuerSnapshot" JSONB,
    ADD COLUMN "counterpartySnapshot" JSONB,
    ADD COLUMN "taxSnapshot" JSONB;

UPDATE "Invoice"
SET
    "documentStatus" = CASE WHEN "status" = 'STORNO' THEN 'CANCELLED' ELSE 'ISSUED' END,
    "finalizedAt" = CASE WHEN "status" = 'STORNO' THEN NULL ELSE "issueDate" END,
    "cancelledAt" = CASE WHEN "status" = 'STORNO' THEN "updatedAt" ELSE NULL END;

-- AlterTable
ALTER TABLE "InvoiceItem"
    ADD COLUMN "productId" TEXT,
    ADD COLUMN "lineNumber" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "productSku" TEXT,
    ADD COLUMN "totalNetCents" INTEGER,
    ADD COLUMN "totalVatCents" INTEGER,
    ADD COLUMN "totalGrossCents" INTEGER,
    ADD COLUMN "taxCategory" TEXT;

UPDATE "InvoiceItem"
SET
    "totalNetCents" = ROUND(("quantity" * "unitPriceCents")::numeric)::integer,
    "totalVatCents" = ROUND(
        (ROUND(("quantity" * "unitPriceCents")::numeric) * "vatRate" / 100)::numeric
    )::integer;

UPDATE "InvoiceItem"
SET "totalGrossCents" = "totalNetCents" + "totalVatCents";

WITH numbered_items AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (PARTITION BY "invoiceId" ORDER BY "id")::integer AS "rowNumber"
    FROM "InvoiceItem"
)
UPDATE "InvoiceItem"
SET "lineNumber" = numbered_items."rowNumber"
FROM numbered_items
WHERE "InvoiceItem"."id" = numbered_items."id";

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "ico" TEXT NOT NULL,
    "dic" TEXT NOT NULL,
    "icDph" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'SK',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxProfile" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "vatStatus" TEXT NOT NULL DEFAULT 'NON_PAYER',
    "vatRegisteredFrom" TIMESTAMP(3),
    "domesticTaxMode" TEXT NOT NULL DEFAULT 'STANDARD',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "accountantConfirmedAt" TIMESTAMP(3),
    "accountantConfirmedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVatRate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "sourceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVatRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "consentId" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenKeyVersion" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "syncCursor" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT,
    "bankConnectionId" TEXT,
    "providerAccountId" TEXT,
    "name" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "bic" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "bankConnectionId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "providerTransactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "valueDate" TIMESTAMP(3),
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "counterpartyName" TEXT,
    "counterpartyIban" TEXT,
    "variableSymbol" TEXT,
    "constantSymbol" TEXT,
    "specificSymbol" TEXT,
    "remittanceInfo" TEXT,
    "rawPayload" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'INCOMING',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "variableSymbol" TEXT,
    "counterpartyName" TEXT,
    "counterpartyIban" TEXT,
    "bankTransactionId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reverseReason" TEXT,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAsset" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'RAILWAY_BUCKET',
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "isImmutable" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "documentId" TEXT,
    "outboxEventId" TEXT,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "partnerCount" INTEGER NOT NULL DEFAULT 0,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "totalGrossCents" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "backupReference" TEXT,
    "createdById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyProfile_validFrom_validTo_idx" ON "CompanyProfile"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_companyProfileId_validFrom_key" ON "TaxProfile"("companyProfileId", "validFrom");

-- CreateIndex
CREATE INDEX "TaxProfile_validFrom_validTo_idx" ON "TaxProfile"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVatRate_productId_validFrom_key" ON "ProductVatRate"("productId", "validFrom");

-- CreateIndex
CREATE INDEX "ProductVatRate_validFrom_validTo_idx" ON "ProductVatRate"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "Invoice_direction_documentStatus_issueDate_idx" ON "Invoice"("direction", "documentStatus", "issueDate");

-- CreateIndex
CREATE INDEX "Invoice_originalInvoiceId_idx" ON "Invoice"("originalInvoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_lineNumber_idx" ON "InvoiceItem"("invoiceId", "lineNumber");

-- CreateIndex
CREATE INDEX "Payment_variableSymbol_currency_amountCents_idx" ON "Payment"("variableSymbol", "currency", "amountCents");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bankTransactionId_key" ON "Payment"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_invoiceId_key" ON "PaymentAllocation"("paymentId", "invoiceId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_invoiceId_reversedAt_idx" ON "PaymentAllocation"("invoiceId", "reversedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_iban_currency_key" ON "BankAccount"("iban", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_bankConnectionId_providerAccountId_key" ON "BankAccount"("bankConnectionId", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_bankConnectionId_providerTransactionId_key" ON "BankTransaction"("bankConnectionId", "providerTransactionId");

-- CreateIndex
CREATE INDEX "BankTransaction_bankAccountId_bookingDate_idx" ON "BankTransaction"("bankAccountId", "bookingDate");

-- CreateIndex
CREATE INDEX "BankTransaction_variableSymbol_currency_amountCents_idx" ON "BankTransaction"("variableSymbol", "currency", "amountCents");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAsset_objectKey_key" ON "DocumentAsset"("objectKey");

-- CreateIndex
CREATE INDEX "DocumentAsset_invoiceId_type_idx" ON "DocumentAsset"("invoiceId", "type");

-- CreateIndex
CREATE INDEX "DocumentAsset_sha256_idx" ON "DocumentAsset"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_outboxEventId_key" ON "EmailDelivery"("outboxEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_providerMessageId_key" ON "EmailDelivery"("providerMessageId");

-- CreateIndex
CREATE INDEX "EmailDelivery_invoiceId_createdAt_idx" ON "EmailDelivery"("invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDelivery_status_nextAttemptAt_idx" ON "EmailDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_source_sha256_mode_key" ON "ImportBatch"("source", "sha256", "mode");

-- CreateIndex
CREATE INDEX "ImportBatch_source_status_idx" ON "ImportBatch"("source", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "TaxProfile" ADD CONSTRAINT "TaxProfile_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVatRate" ADD CONSTRAINT "ProductVatRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "OutboxEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
