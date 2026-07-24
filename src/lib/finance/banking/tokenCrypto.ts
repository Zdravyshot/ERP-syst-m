import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Šifrovanie obnoviteľných (refresh) tokenov pre BankConnection.
 * AES-256-GCM; kľúč je 64-znakový hex v env BANK_TOKEN_KEY (Railway variable).
 * Formát ciphertextu: v1:<iv hex>:<authTag hex>:<data hex> — verzia kľúča sa
 * ukladá aj do BankConnection.tokenKeyVersion kvôli budúcej rotácii.
 */

export const TOKEN_KEY_VERSION = "v1";

function loadKey(): Buffer {
  const hex = process.env.BANK_TOKEN_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("BANK_TOKEN_KEY musí byť 64-znakový hex (openssl rand -hex 32).");
  }
  return Buffer.from(hex, "hex");
}

export function encryptToken(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${TOKEN_KEY_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(ciphertext: string): string {
  const [version, ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (version !== TOKEN_KEY_VERSION || !ivHex || !tagHex || !dataHex) {
    throw new Error(`Neznámy formát alebo verzia šifrovaného tokenu (${version ?? "?"}).`);
  }
  const key = loadKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
