import type {
  BankAccountResult,
  BankBalanceResult,
  BankProvider,
  BankSyncPage,
  BankTransactionResult,
  Currency,
} from "@/lib/finance/contracts";

/**
 * TatraPremiumApiProvider — implementácia BankProvider nad Premium API
 * (PSD2 AISP štýl). Presné cesty/polia sa doladia podľa sandbox dokumentácie
 * pri aktivácii; mapovanie odpovedí je izolované v map* funkciách nižšie,
 * aby úprava znamenala zmenu jedného miesta.
 *
 * Provider NIKDY nesiaha do databázy — refresh token dostane cez callbacky,
 * takže šifrované uloženie rieši sync vrstva (sync.ts).
 */

export type BankErrorKind = "AUTH" | "REAUTH_REQUIRED" | "RATE_LIMIT" | "OUTAGE" | "PROTOCOL";

export class BankProviderError extends Error {
  readonly kind: BankErrorKind;

  constructor(kind: BankErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "BankProviderError";
  }
}

export interface TatraPremiumConfig {
  apiBase: string;
  clientId: string;
  clientSecret: string;
  /** Vráti aktuálny refresh token (dešifrovaný sync vrstvou). */
  getRefreshToken: () => Promise<string>;
  /** Zavolá sa pri rotácii refresh tokenu — sync vrstva ho zašifruje a uloží. */
  onRefreshTokenRotated: (newToken: string, expiresAt: Date | null) => Promise<void>;
  fetchImpl?: typeof fetch;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

/** Kurzor syncu: JSON so zoznamom účtov a pozíciou stránkovania. */
interface SyncCursor {
  accountIds: string[];
  accountIndex: number;
  page: number;
  fromBookingDate: string; // ISO date — odkiaľ sťahujeme
}

const PAGE_SIZE = 100;

function asCents(amount: unknown): number {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : (amount as number);
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new BankProviderError("PROTOCOL", `Neplatná suma v odpovedi banky: ${String(amount)}`);
  }
  return Math.round(value * 100);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapAccount(raw: any): BankAccountResult {
  return {
    providerAccountId: String(raw.accountId ?? raw.resourceId ?? raw.id),
    name: String(raw.name ?? raw.product ?? "Účet"),
    iban: String(raw.iban ?? raw.accountReference?.iban ?? ""),
    bic: raw.bic ? String(raw.bic) : undefined,
    currency: (raw.currency ?? "EUR") as Currency,
  };
}

function mapBalance(raw: any, providerAccountId: string): BankBalanceResult {
  return {
    providerAccountId,
    availableCents: asCents(raw.available?.amount ?? raw.interimAvailable?.amount ?? 0),
    bookedCents: asCents(raw.booked?.amount ?? raw.closingBooked?.amount ?? 0),
    currency: (raw.currency ?? "EUR") as Currency,
    measuredAt: new Date(),
  };
}

function mapTransaction(raw: any, providerAccountId: string): BankTransactionResult {
  const symbols = raw.symbols ?? {};
  return {
    providerTransactionId: String(raw.transactionId ?? raw.entryReference ?? raw.id),
    providerAccountId,
    status: (raw.status ?? "BOOKED") === "PENDING" ? "PENDING" : "BOOKED",
    bookingDate: new Date(raw.bookingDate ?? raw.valueDate),
    valueDate: raw.valueDate ? new Date(raw.valueDate) : undefined,
    amountCents: asCents(raw.transactionAmount?.amount ?? raw.amount),
    currency: (raw.transactionAmount?.currency ?? raw.currency ?? "EUR") as Currency,
    counterpartyName: raw.creditorName ?? raw.debtorName ?? undefined,
    counterpartyIban: raw.creditorAccount?.iban ?? raw.debtorAccount?.iban ?? undefined,
    variableSymbol: symbols.variableSymbol ?? raw.variableSymbol ?? undefined,
    constantSymbol: symbols.constantSymbol ?? raw.constantSymbol ?? undefined,
    specificSymbol: symbols.specificSymbol ?? raw.specificSymbol ?? undefined,
    remittanceInfo: raw.remittanceInformationUnstructured ?? raw.remittanceInfo ?? undefined,
    rawPayload: raw,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class TatraPremiumApiProvider implements BankProvider {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(private readonly config: TatraPremiumConfig) {}

  private get fetchImpl(): typeof fetch {
    return this.config.fetchImpl ?? fetch;
  }

  private async refreshAccessToken(): Promise<void> {
    const refreshToken = await this.config.getRefreshToken();
    const response = await this.fetchImpl(`${this.config.apiBase}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    }).catch((e: unknown) => {
      throw new BankProviderError("OUTAGE", `Banka nedostupná pri obnove tokenu: ${e instanceof Error ? e.message : String(e)}`);
    });

    if (response.status === 400 || response.status === 401) {
      throw new BankProviderError(
        "REAUTH_REQUIRED",
        "Refresh token je neplatný alebo expirovaný — vyžaduje sa nová autorizácia v banke.",
      );
    }
    if (!response.ok) {
      throw new BankProviderError("OUTAGE", `Obnova tokenu zlyhala (HTTP ${response.status}).`);
    }

    const token = (await response.json()) as TokenResponse;
    this.accessToken = token.access_token;
    this.accessTokenExpiresAt = Date.now() + Math.max(0, (token.expires_in - 30) * 1000);

    if (token.refresh_token) {
      const expiresAt = token.refresh_token_expires_in
        ? new Date(Date.now() + token.refresh_token_expires_in * 1000)
        : null;
      await this.config.onRefreshTokenRotated(token.refresh_token, expiresAt);
    }
  }

  private async authorizedGet(path: string, retried = false): Promise<unknown> {
    if (!this.accessToken || Date.now() >= this.accessTokenExpiresAt) {
      await this.refreshAccessToken();
    }

    const response = await this.fetchImpl(`${this.config.apiBase}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    }).catch((e: unknown) => {
      throw new BankProviderError("OUTAGE", `Banka nedostupná: ${e instanceof Error ? e.message : String(e)}`);
    });

    if (response.status === 401 && !retried) {
      this.accessToken = null;
      return this.authorizedGet(path, true);
    }
    if (response.status === 401) {
      throw new BankProviderError("REAUTH_REQUIRED", "Prístup zamietnutý aj po obnove tokenu.");
    }
    if (response.status === 429) {
      throw new BankProviderError("RATE_LIMIT", "Prekročený limit volaní banky — sync sa zopakuje neskôr.");
    }
    if (!response.ok) {
      throw new BankProviderError("OUTAGE", `Volanie banky zlyhalo (HTTP ${response.status}).`);
    }
    return response.json();
  }

  async listAccounts(): Promise<BankAccountResult[]> {
    const data = (await this.authorizedGet("/accounts")) as { accounts?: unknown[] };
    return (data.accounts ?? []).map(mapAccount);
  }

  async getBalances(): Promise<BankBalanceResult[]> {
    const accounts = await this.listAccounts();
    const balances: BankBalanceResult[] = [];
    for (const account of accounts) {
      const data = (await this.authorizedGet(`/accounts/${account.providerAccountId}/balances`)) as {
        balances?: unknown[];
      };
      const first = data.balances?.[0];
      if (first) balances.push(mapBalance(first, account.providerAccountId));
    }
    return balances;
  }

  /**
   * Idempotentné stránkované sťahovanie: kurzor si nesie zoznam účtov,
   * index účtu, stránku a fromBookingDate. Deduplikáciu rieši databázová
   * unikátnosť [bankConnectionId, providerTransactionId] v sync vrstve.
   */
  async syncTransactions(cursor?: string): Promise<BankSyncPage> {
    let state: SyncCursor;
    if (cursor) {
      try {
        state = JSON.parse(cursor) as SyncCursor;
      } catch {
        throw new BankProviderError("PROTOCOL", "Neplatný sync kurzor.");
      }
    } else {
      const accounts = await this.listAccounts();
      const from = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      state = { accountIds: accounts.map((a) => a.providerAccountId), accountIndex: 0, page: 1, fromBookingDate: from };
    }

    if (state.accountIndex >= state.accountIds.length) {
      return { transactions: [], hasMore: false };
    }

    const accountId = state.accountIds[state.accountIndex];
    const data = (await this.authorizedGet(
      `/accounts/${accountId}/transactions?dateFrom=${state.fromBookingDate}&page=${state.page}&pageSize=${PAGE_SIZE}`,
    )) as { transactions?: unknown[]; nextPage?: boolean };

    const transactions = (data.transactions ?? []).map((raw) => mapTransaction(raw, accountId));

    const next: SyncCursor = data.nextPage
      ? { ...state, page: state.page + 1 }
      : { ...state, accountIndex: state.accountIndex + 1, page: 1 };
    const hasMore = data.nextPage === true || next.accountIndex < state.accountIds.length;

    return {
      transactions,
      nextCursor: hasMore ? JSON.stringify(next) : undefined,
      hasMore,
    };
  }

  async reconnect(): Promise<void> {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    await this.refreshAccessToken();
  }
}
