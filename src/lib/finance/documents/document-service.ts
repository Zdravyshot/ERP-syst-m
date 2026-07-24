import type {
  AuthorizedDocumentDownload,
  DocumentService,
  StoredDocument,
} from "../contracts";
import {
  DocumentConfigurationError,
  DocumentIntegrityError,
  DocumentNotFoundError,
} from "./errors";
import { hashesEqual, sha256 } from "./hash";
import type {
  DocumentObjectStorage,
  DocumentRepository,
  InvoicePdfRenderer,
} from "./types";

const PDF_CONTENT_TYPE = "application/pdf";

function safeInvoiceNumber(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "doklad";
}

export class DefaultDocumentService implements DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: DocumentObjectStorage,
    private readonly renderer: InvoicePdfRenderer,
  ) {}

  private assertStorageMatches(document: {
    storageProvider: string;
    bucket: string;
  }): void {
    if (
      document.storageProvider !== this.storage.provider ||
      document.bucket !== this.storage.bucket
    ) {
      throw new DocumentConfigurationError(
        "Dokument patrí do iného úložiska, než je aktuálne nakonfigurované.",
      );
    }
  }

  async generateAndStoreInvoicePdf(invoiceId: string): Promise<StoredDocument> {
    const data = await this.repository.getInvoicePdfData(invoiceId);
    if (!data) throw new DocumentNotFoundError("Faktúra sa nenašla.");

    const bytes = await this.renderer.render(data);
    const checksum = sha256(bytes);
    const type =
      data.documentType === "CREDIT_NOTE" ? "CREDIT_NOTE_PDF" : "INVOICE_PDF";
    const prefix = data.documentType === "CREDIT_NOTE" ? "dobropis" : "faktura";
    const fileName = `${prefix}-${safeInvoiceNumber(data.invoiceNumber)}.pdf`;
    const objectKey = `finance/invoices/${data.id}/${checksum}.pdf`;

    await this.storage.putImmutable({
      objectKey,
      contentType: PDF_CONTENT_TYPE,
      bytes,
      sha256: checksum,
    });

    return this.repository.saveGeneratedDocument({
      invoiceId: data.id,
      type,
      storageProvider: this.storage.provider,
      bucket: this.storage.bucket,
      objectKey,
      fileName,
      contentType: PDF_CONTENT_TYPE,
      byteSize: bytes.byteLength,
      sha256: checksum,
    });
  }

  async verifyHash(documentId: string): Promise<boolean> {
    const document = await this.repository.getDocument(documentId);
    if (!document || document.archivedAt) return false;
    this.assertStorageMatches(document);
    const object = await this.storage.getObject(document.objectKey);
    const actualHash = sha256(object.bytes);
    return (
      object.byteSize === document.byteSize &&
      hashesEqual(actualHash, document.sha256) &&
      (!object.sha256 || hashesEqual(object.sha256, document.sha256))
    );
  }

  async getAuthorizedDownload(
    documentId: string,
    actorId: string,
  ): Promise<AuthorizedDocumentDownload> {
    const document = await this.repository.getDocument(documentId);
    if (!document || document.archivedAt) throw new DocumentNotFoundError();
    this.assertStorageMatches(document);
    if (!document.isImmutable) {
      throw new DocumentIntegrityError("Dokument nie je označený ako nemenný.");
    }

    const object = await this.storage.getObject(document.objectKey);
    const actualHash = sha256(object.bytes);
    if (
      object.byteSize !== document.byteSize ||
      !hashesEqual(actualHash, document.sha256) ||
      (object.sha256 && !hashesEqual(object.sha256, document.sha256))
    ) {
      throw new DocumentIntegrityError();
    }

    await this.repository.recordAuthorizedDownload({ document, actorId });
    const responseBytes = Uint8Array.from(object.bytes);

    return {
      fileName: document.fileName,
      contentType: document.contentType,
      contentLength: responseBytes.byteLength,
      body: new Blob([responseBytes]).stream(),
    };
  }
}
