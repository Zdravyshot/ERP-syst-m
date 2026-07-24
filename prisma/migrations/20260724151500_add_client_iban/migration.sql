-- IBAN odberateľa sa používa ako sekundárny signál pri bankovom párovaní.
ALTER TABLE "Client" ADD COLUMN "iban" TEXT;

CREATE INDEX "Client_iban_idx" ON "Client"("iban");
