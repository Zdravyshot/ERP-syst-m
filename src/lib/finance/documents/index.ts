import type { DocumentService } from "../contracts";
import { DefaultDocumentService } from "./document-service";
import { SlovakInvoicePdfRenderer } from "./pdf-renderer";
import { PrismaDocumentRepository } from "./prisma-repository";
import { readS3DocumentStorageConfig, S3DocumentStorage } from "./storage";

let service: DocumentService | undefined;

export function getDocumentService(): DocumentService {
  service ??= new DefaultDocumentService(
    new PrismaDocumentRepository(),
    new S3DocumentStorage(readS3DocumentStorageConfig()),
    new SlovakInvoicePdfRenderer(),
  );
  return service;
}

export * from "./document-service";
export * from "./errors";
export * from "./hash";
export * from "./pay-by-square";
export * from "./pdf-renderer";
export * from "./storage";
export type * from "./types";
