import assert from "node:assert/strict";
import test from "node:test";
import type { StoredDocument } from "../contracts";
import { DefaultDocumentService } from "./document-service";
import { DocumentIntegrityError } from "./errors";
import { sha256 } from "./hash";
import { MemoryDocumentStorage } from "./storage";
import { createInvoicePdfFixture } from "./test-fixtures";
import type {
  DocumentRecord,
  DocumentRepository,
  GeneratedDocumentInput,
  InvoicePdfData,
  InvoicePdfRenderer,
} from "./types";

class FixedRenderer implements InvoicePdfRenderer {
  readonly bytes = new TextEncoder().encode("%PDF-test-document");

  async render(): Promise<Uint8Array> {
    return Uint8Array.from(this.bytes);
  }
}

class FakeDocumentRepository implements DocumentRepository {
  readonly audits: Array<{ documentId: string; actorId: string }> = [];
  document?: DocumentRecord;

  constructor(private readonly invoice: InvoicePdfData | null) {}

  async getInvoicePdfData(): Promise<InvoicePdfData | null> {
    return this.invoice;
  }

  async saveGeneratedDocument(input: GeneratedDocumentInput): Promise<StoredDocument> {
    this.document ??= {
      id: "document-test-1",
      invoiceId: input.invoiceId,
      type: input.type,
      storageProvider: input.storageProvider,
      bucket: input.bucket,
      objectKey: input.objectKey,
      fileName: input.fileName,
      contentType: input.contentType,
      byteSize: input.byteSize,
      sha256: input.sha256,
      isImmutable: true,
      createdAt: new Date("2026-07-24T12:00:00.000Z"),
    };
    return this.document;
  }

  async getDocument(): Promise<DocumentRecord | null> {
    return this.document ?? null;
  }

  async recordAuthorizedDownload(input: {
    document: DocumentRecord;
    actorId: string;
  }): Promise<void> {
    this.audits.push({
      documentId: input.document.id,
      actorId: input.actorId,
    });
  }
}

test("služba uloží obsahovo adresovaný nemenný dokument idempotentne", async () => {
  const repository = new FakeDocumentRepository(createInvoicePdfFixture());
  const storage = new MemoryDocumentStorage();
  const renderer = new FixedRenderer();
  const service = new DefaultDocumentService(repository, storage, renderer);

  const first = await service.generateAndStoreInvoicePdf("invoice-test-1");
  const second = await service.generateAndStoreInvoicePdf("invoice-test-1");
  const expectedHash = sha256(renderer.bytes);

  assert.equal(first.id, second.id);
  assert.equal(first.sha256, expectedHash);
  assert.equal(
    first.objectKey,
    `finance/invoices/invoice-test-1/${expectedHash}.pdf`,
  );
  assert.equal(await service.verifyHash(first.id), true);
});

test("autorizovaný download overí hash a vytvorí audit", async () => {
  const repository = new FakeDocumentRepository(createInvoicePdfFixture());
  const storage = new MemoryDocumentStorage();
  const renderer = new FixedRenderer();
  const service = new DefaultDocumentService(repository, storage, renderer);
  const document = await service.generateAndStoreInvoicePdf("invoice-test-1");

  const download = await service.getAuthorizedDownload(
    document.id,
    "finance-admin-1",
  );
  const bytes = new Uint8Array(await new Response(download.body).arrayBuffer());

  assert.deepEqual(bytes, renderer.bytes);
  assert.deepEqual(repository.audits, [
    { documentId: document.id, actorId: "finance-admin-1" },
  ]);

  storage.overwriteForTest(document.objectKey, new TextEncoder().encode("tampered"));
  assert.equal(await service.verifyHash(document.id), false);
  await assert.rejects(
    service.getAuthorizedDownload(document.id, "finance-admin-1"),
    DocumentIntegrityError,
  );
  assert.equal(repository.audits.length, 1);
});
