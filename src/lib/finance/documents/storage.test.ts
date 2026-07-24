import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { beforeEach, expect, test, vi } from "vitest";
import { DocumentConfigurationError } from "./errors";
import { S3DocumentStorage } from "./storage";

const send = vi.fn();
const config = {
  bucket: "finance-private",
  endpoint: "https://bucket.example.test",
  region: "auto",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  maxDocumentBytes: 8,
};

function storage(): S3DocumentStorage {
  return new S3DocumentStorage(config, { send } as unknown as S3Client);
}

beforeEach(() => {
  send.mockReset();
});

test("S3 zápis je podmienený a nesmie prepísať existujúci objekt", async () => {
  send.mockResolvedValue({});

  await storage().putImmutable({
    objectKey: "finance/invoices/1/hash.pdf",
    contentType: "application/pdf",
    bytes: new Uint8Array([1, 2, 3]),
    sha256: "abc123",
  });

  expect(send).toHaveBeenCalledOnce();
  const command = send.mock.calls[0]?.[0];
  expect(command).toBeInstanceOf(PutObjectCommand);
  expect(command.input).toMatchObject({
    Bucket: "finance-private",
    Key: "finance/invoices/1/hash.pdf",
    ContentType: "application/pdf",
    ContentLength: 3,
    IfNoneMatch: "*",
    Metadata: { sha256: "abc123", immutable: "true" },
  });
});

test("S3 zápis považuje kolíziu obsahu za idempotentný výsledok", async () => {
  send.mockRejectedValue({
    name: "PreconditionFailed",
    $metadata: { httpStatusCode: 412 },
  });

  await expect(
    storage().putImmutable({
      objectKey: "finance/invoices/1/hash.pdf",
      contentType: "application/pdf",
      bytes: new Uint8Array([1]),
      sha256: "abc123",
    }),
  ).resolves.toBeUndefined();
});

test("S3 download odmietne dokument nad nakonfigurovaným limitom", async () => {
  send.mockImplementation((command: unknown) => {
    expect(command).toBeInstanceOf(GetObjectCommand);
    return Promise.resolve({
      Body: { transformToByteArray: vi.fn() },
      ContentLength: 9,
    });
  });

  await expect(storage().getObject("finance/large.pdf")).rejects.toBeInstanceOf(
    DocumentConfigurationError,
  );
});
