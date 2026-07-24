import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { parseStatementCsv, statementTransactionId } from "./statement";
import { decryptToken, encryptToken } from "./tokenCrypto";
import { tatraPremiumEnabled } from "./flags";

const CSV = [
  "Dátum zaúčtovania;Suma;Mena;VS;KS;ŠS;Protiúčet;Názov protistrany;Popis",
  "22.7.2026;178,20;EUR;2026009;0308;;SK3112000000198742637541;Fitko Havran s.r.o.;Úhrada faktúry",
  "23.7.2026;-84,00;EUR;;;;SK8975000000004000123456;Bio Farma Šariš;Nákup surovín",
  "zlý riadok bez dátumu;;;;;;;;",
].join("\n");

describe("parseStatementCsv", () => {
  it("naparsuje transakcie so symbolmi a znamienkami", () => {
    const { transactions, skippedLines } = parseStatementCsv(CSV, "SK1111000000002612345678");
    expect(transactions).toHaveLength(2);
    expect(skippedLines).toBe(1);

    const [incoming, outgoing] = transactions;
    expect(incoming.amountCents).toBe(17820);
    expect(incoming.variableSymbol).toBe("2026009");
    expect(incoming.counterpartyIban).toBe("SK3112000000198742637541");
    expect(incoming.bookingDate.toISOString().slice(0, 10)).toBe("2026-07-22");
    expect(outgoing.amountCents).toBe(-8400);
  });

  it("deterministické ID — rovnaký riadok dá rovnaké ID (idempotentný re-import)", () => {
    const a = parseStatementCsv(CSV, "SK1111000000002612345678").transactions[0];
    const b = parseStatementCsv(CSV, "SK1111000000002612345678").transactions[0];
    expect(a.providerTransactionId).toBe(b.providerTransactionId);
    expect(a.providerTransactionId).toMatch(/^stmt-[0-9a-f]{32}$/);
  });

  it("rôzne riadky dajú rôzne ID", () => {
    const idA = statementTransactionId({ bookingDate: "2026-07-22", amountCents: 17820, variableSymbol: "1" });
    const idB = statementTransactionId({ bookingDate: "2026-07-22", amountCents: 17820, variableSymbol: "2" });
    expect(idA).not.toBe(idB);
  });

  it("chýbajúce povinné stĺpce → zrozumiteľná chyba", () => {
    expect(() => parseStatementCsv("Foo;Bar\n1;2", "SK11")).toThrow(/povinné stĺpce/);
  });

  it("neplatný kalendárny dátum a suma s viac ako dvoma desatinnými miestami preskočí", () => {
    const malformed = [
      "Dátum;Suma;Mena",
      "31.2.2026;10,00;EUR",
      "22.7.2026;10,999;EUR",
    ].join("\n");
    const result = parseStatementCsv(malformed, "SK1111000000002612345678");
    expect(result.transactions).toHaveLength(0);
    expect(result.skippedLines).toBe(2);
  });

  it("nepodporovanú menu neoznačí nesprávne ako EUR", () => {
    const czk = "Dátum;Suma;Mena\n22.7.2026;100,00;CZK";
    const result = parseStatementCsv(czk, "SK1111000000002612345678");
    expect(result.transactions).toHaveLength(0);
    expect(result.skippedLines).toBe(1);
  });
});

describe("tokenCrypto", () => {
  const KEY = "a".repeat(64);

  beforeEach(() => {
    process.env.BANK_TOKEN_KEY = KEY;
  });
  afterEach(() => {
    delete process.env.BANK_TOKEN_KEY;
  });

  it("encrypt/decrypt roundtrip", () => {
    const ciphertext = encryptToken("refresh-token-123");
    expect(ciphertext.startsWith("v1:")).toBe(true);
    expect(ciphertext).not.toContain("refresh-token-123");
    expect(decryptToken(ciphertext)).toBe("refresh-token-123");
  });

  it("pozmenený ciphertext neprejde autentifikáciou GCM", () => {
    const ciphertext = encryptToken("secret");
    const parts = ciphertext.split(":");
    parts[3] = parts[3].replace(/^../, "00");
    expect(() => decryptToken(parts.join(":"))).toThrow();
  });

  it("zlý kľúč v env → zrozumiteľná chyba", () => {
    process.env.BANK_TOKEN_KEY = "kratky";
    expect(() => encryptToken("x")).toThrow(/BANK_TOKEN_KEY/);
  });
});

describe("feature flag", () => {
  const VARS = ["TATRA_PREMIUM_ENABLED", "TATRA_API_BASE", "TATRA_CLIENT_ID", "TATRA_CLIENT_SECRET", "BANK_TOKEN_KEY"];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const v of VARS) {
      saved[v] = process.env[v];
      delete process.env[v];
    }
  });
  afterEach(() => {
    for (const v of VARS) {
      if (saved[v] === undefined) delete process.env[v];
      else process.env[v] = saved[v];
    }
  });

  it("vypnutý bez konfigurácie; zapnutý až s kompletnou konfiguráciou", () => {
    expect(tatraPremiumEnabled()).toBe(false);
    process.env.TATRA_PREMIUM_ENABLED = "1";
    expect(tatraPremiumEnabled()).toBe(false);
    process.env.TATRA_API_BASE = "https://sandbox";
    process.env.TATRA_CLIENT_ID = "id";
    process.env.TATRA_CLIENT_SECRET = "secret";
    process.env.BANK_TOKEN_KEY = "a".repeat(64);
    expect(tatraPremiumEnabled()).toBe(true);
  });
});
