# Zdravý shot ERP

Interný ERP systém pre Zdravý shot — výroba, sklad, objednávky, financie, plnenie plánu.

## Rýchly štart

Lokálny vývoj aj produkcia používajú PostgreSQL. Po vytvorení lokálnej databázy:

```bash
npm install
cp .env.example .env        # nastav DATABASE_URL, SESSION_SECRET a INBOX_API_KEY
npx prisma migrate dev
npx prisma db seed          # iba lokálne/demo prostredie
npm run dev                 # http://localhost:3000
```

Prihlásenie: `admin@zdravyshot.sk` / `zdravyshot123`

Demo prihlasovanie platí iba po lokálnom seede. Produkčnú databázu seedujte len vedome a heslá okamžite zmeňte.

## Railway produkcia

- Web služba: GitHub vetva `main`, build `npm run build`, start `npm start`.
- PostgreSQL: `DATABASE_URL` je referenčná premenná z Railway Postgres služby.
- Pre-deploy command: `npm run db:deploy`.
- Povinné secrets: `SESSION_SECRET`, `INBOX_API_KEY` (náhodné hodnoty s aspoň 32 znakmi).
- Produkčný seed sa automaticky nespúšťa.

### Lokálna záloha produkcie

Po nainštalovaní Railway CLI a PostgreSQL klienta (`brew install libpq`) spustite:

```bash
npm run backup:production
```

Dump sa uloží do ignorovaného adresára `backups/` s oprávnením iba pre lokálneho používateľa. Zálohy staršie ako 30 dní sa automaticky odstránia. Railway snapshoty nastavte súbežne v PostgreSQL službe v záložke **Backups**.

## Dokumentácia

- **[PLAN.md](PLAN.md)** — plán práce a rozdelenie medzi Dev A / Dev B
- **[AGENTS.md](AGENTS.md)** — konvencie, architektúra a GitHub workflow (číta ho aj Claude Code)

## Moduly

Dashboard · Výroba (receptúry, šarže) · Sklad (pohybový ledger) · Objednávky (+ predplatné, inbox) · Plnenie plánu · Financie (faktúry interné + web + SuperFaktúra, eKasa, export) · Klienti · Konkurencia (pripravený stub)

## Externé vstupy

- `POST /api/inbox` (hlavička `x-api-key`) — objednávky/dopyty z webu, neskôr e-maily
- `GET /api/konkurencia` — stub pre budúci model sledovania konkurencie
