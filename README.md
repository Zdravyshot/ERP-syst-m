# Zdravý shot ERP

Interný ERP systém pre Zdravý shot — výroba, sklad, objednávky, financie, plnenie plánu.

## Rýchly štart

```bash
npm install
cp .env.example .env        # uprav SESSION_SECRET a INBOX_API_KEY
npx prisma migrate dev      # vytvorí SQLite DB + migrácie
npx prisma db seed          # demo dáta
npm run dev                 # http://localhost:3000
```

Prihlásenie: `admin@zdravyshot.sk` / `zdravyshot123`

## Dokumentácia

- **[PLAN.md](PLAN.md)** — plán práce a rozdelenie medzi Dev A / Dev B
- **[AGENTS.md](AGENTS.md)** — konvencie, architektúra a GitHub workflow (číta ho aj Claude Code)

## Moduly

Dashboard · Výroba (receptúry, šarže) · Sklad (pohybový ledger) · Objednávky (+ predplatné, inbox) · Plnenie plánu · Financie (faktúry interné + web + SuperFaktúra, eKasa, export) · Klienti · Konkurencia (pripravený stub)

## Externé vstupy

- `POST /api/inbox` (hlavička `x-api-key`) — objednávky/dopyty z webu, neskôr e-maily
- `GET /api/konkurencia` — stub pre budúci model sledovania konkurencie
