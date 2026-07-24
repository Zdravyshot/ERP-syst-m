import { describe, expect, it, vi } from "vitest";
import { BankProviderError, TatraPremiumApiProvider, type TatraPremiumConfig } from "./tatraPremium";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeProvider(fetchImpl: typeof fetch, overrides: Partial<TatraPremiumConfig> = {}) {
  const rotated: Array<{ token: string; expiresAt: Date | null }> = [];
  const provider = new TatraPremiumApiProvider({
    apiBase: "https://sandbox.tatrabanka.sk/premium",
    clientId: "client",
    clientSecret: "secret",
    getRefreshToken: async () => "refresh-1",
    onRefreshTokenRotated: async (token, expiresAt) => {
      rotated.push({ token, expiresAt });
    },
    fetchImpl,
    ...overrides,
  });
  return { provider, rotated };
}

const TOKEN_OK = { access_token: "at-1", token_type: "Bearer", expires_in: 600 };

describe("TatraPremiumApiProvider — autentifikácia", () => {
  it("získa access token a uloží rotovaný refresh token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { ...TOKEN_OK, refresh_token: "refresh-2", refresh_token_expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(200, { accounts: [{ accountId: "acc-1", iban: "SK31...", name: "Bežný" }] }));

    const { provider, rotated } = makeProvider(fetchMock as unknown as typeof fetch);
    const accounts = await provider.listAccounts();

    expect(accounts).toHaveLength(1);
    expect(rotated).toHaveLength(1);
    expect(rotated[0].token).toBe("refresh-2");
    const tokenCall = fetchMock.mock.calls[0];
    expect(String(tokenCall[0])).toContain("/oauth2/token");
  });

  it("neplatný refresh token → REAUTH_REQUIRED", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { error: "invalid_grant" }));
    const { provider } = makeProvider(fetchMock as unknown as typeof fetch);

    await expect(provider.listAccounts()).rejects.toMatchObject({ kind: "REAUTH_REQUIRED" });
  });

  it("401 na API → jedna obnova tokenu a retry; druhé 401 → REAUTH_REQUIRED", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_OK)) // token
      .mockResolvedValueOnce(jsonResponse(401, {})) // accounts → 401
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_OK)) // refresh znova
      .mockResolvedValueOnce(jsonResponse(401, {})); // accounts → stále 401

    const { provider } = makeProvider(fetchMock as unknown as typeof fetch);
    await expect(provider.listAccounts()).rejects.toMatchObject({ kind: "REAUTH_REQUIRED" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("TatraPremiumApiProvider — výpadok a limity", () => {
  it("network error → OUTAGE", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const { provider } = makeProvider(fetchMock as unknown as typeof fetch);
    await expect(provider.listAccounts()).rejects.toMatchObject({ kind: "OUTAGE" });
  });

  it("HTTP 429 → RATE_LIMIT", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_OK))
      .mockResolvedValueOnce(jsonResponse(429, {}));
    const { provider } = makeProvider(fetchMock as unknown as typeof fetch);
    await expect(provider.listAccounts()).rejects.toMatchObject({ kind: "RATE_LIMIT" });
  });
});

describe("TatraPremiumApiProvider — stránkovanie syncu", () => {
  it("prechádza stránky a účty cez kurzor až po hasMore=false", async () => {
    const txn = (id: string) => ({
      transactionId: id,
      bookingDate: "2026-07-20",
      transactionAmount: { amount: "12.34", currency: "EUR" },
      creditorName: "Klient",
      variableSymbol: "2026009",
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_OK))
      .mockResolvedValueOnce(jsonResponse(200, { accounts: [{ accountId: "acc-1", iban: "SK31...", name: "Bežný" }] }))
      .mockResolvedValueOnce(jsonResponse(200, { transactions: [txn("t-1")], nextPage: true }))
      .mockResolvedValueOnce(jsonResponse(200, { transactions: [txn("t-2")], nextPage: false }));

    const { provider } = makeProvider(fetchMock as unknown as typeof fetch);

    const page1 = await provider.syncTransactions();
    expect(page1.transactions.map((t) => t.providerTransactionId)).toEqual(["t-1"]);
    expect(page1.hasMore).toBe(true);
    expect(page1.transactions[0].amountCents).toBe(1234);

    const page2 = await provider.syncTransactions(page1.nextCursor);
    expect(page2.transactions.map((t) => t.providerTransactionId)).toEqual(["t-2"]);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeUndefined();
  });

  it("neplatný kurzor → PROTOCOL chyba", async () => {
    const fetchMock = vi.fn();
    const { provider } = makeProvider(fetchMock as unknown as typeof fetch);
    await expect(provider.syncTransactions("nie-json")).rejects.toBeInstanceOf(BankProviderError);
  });

  it("nepodporovanú menu nepretypuje na EUR", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, TOKEN_OK))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          accounts: [{ accountId: "acc-czk", iban: "CZ6508000000192000145399", currency: "CZK" }],
        }),
      );
    const { provider } = makeProvider(fetchMock as unknown as typeof fetch);
    await expect(provider.listAccounts()).rejects.toMatchObject({ kind: "PROTOCOL" });
  });
});
