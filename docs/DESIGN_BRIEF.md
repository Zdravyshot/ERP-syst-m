# Design brief — redesign ERP „Zdravý shot“ podľa brandingu zdravyshot.sk

**Pre:** Claude (design session)
**Úloha:** Redesignuj UI interného ERP systému tak, aby vizuálne sedel so značkou zdravyshot.sk — čistý, pekný, profesionálny nástroj, ktorý tím používa každý deň. Mení sa LEN vzhľad (štýly, komponenty, layout) — žiadna zmena biznis logiky, server actions, schémy ani textov.

---

## 1. Čo je to za nástroj

Interný ERP pre výrobcu zázvorových shotov. Next.js 16 (App Router) + Tailwind **v4**, celé UI po slovensky. Moduly: Prehľad (dashboard s KPI), Výroba (šarže, receptúry), Sklad (zásoby, pohyby), Objednávky, Plnenie plánu, Financie, Klienti, Konkurencia. Pred začatím si prečítaj `AGENTS.md` (konvencie + Next 16 odchýlky) a `PLAN.md`.

**Kde žije UI:**
- `src/app/(app)/layout.tsx` + `src/components/Sidebar.tsx` — shell a navigácia
- `src/components/PageHeader.tsx` — hlavičky stránok
- `src/app/(auth)/login/page.tsx` — prihlásenie
- `src/app/(app)/**/page.tsx` + `*.tsx` client formuláre — tabuľky, formuláre, badge
- `src/app/globals.css` — sem patria brand tokeny (Tailwind v4 `@theme`)

**Aktuálny stav:** provizórna emerald (tmavozelená) paleta, systémové fonty Geist, emoji ikony v navigácii. Funkčné, ale generické — nemá to nič spoločné s brandom.

## 2. Branding zdravyshot.sk (extrahované z webu)

**Značka:** Zdravý Shot — „Nie je to len shot. Je to rozhodnutie!“ / „100% Prírodné • Ručná výroba • Bez pasterizácie“. Tón: priamy, autentický, remeselný — žiadny korporát.

**Farby (z live webu):**
| Rola | Hex | Použitie na webe |
|---|---|---|
| Čierna | `#0C0A09` / `#000000` | logo wordmark, texty, tmavé plochy |
| Biela | `#FFFFFF` | pozadia, veľa vzduchu |
| **Žltá (primárny akcent)** | `#FFD52E` (variant `#FBD52E`, tmavší tón `#F1B51E`) | CTA, zvýraznenia — signature farba značky |
| Zelená | `#5BA238`, sýtejšia `#2DA815` | prírodnosť, sekundárny akcent |
| Tmavosivá | `#353030` | sekundárny text |
| Červená | `#EF4444` / `#CF2E2E` | chyby/upozornenia (web ju používa striedmo) |

**Typografia:** Poppins (nadpisy — geometrický, priateľský), Inter (body text), Roboto ako fallback. Načítaj Poppins + Inter cez `next/font/google` namiesto Geist.

**Vizuálny jazyk webu:** veľa bielej, čierny výrazný wordmark, produktová fotografia, čisté karty, zaoblené rohy, minimalizmus.

**Produkty (pre reálnosť obsahu):** Ginger shot – Klasik, Ginger shot – Cvikla, Ginger shot – Ananás a škorica.

## 3. Design direction (odporúčaná)

**Celkovo:** svetlý, vzdušný „clean admin“ — biele/sivobiele pozadie (`#FAFAF9` app pozadie, biele karty), čierne texty, žltá LEN ako akcent na akcie a aktívne stavy. Nie žltá plocha všade — žltá je korenie, nie polievka.

- **Sidebar:** čierna (`#0C0A09`) — nadväzuje na čierny wordmark webu. Logo „Zdravý Shot“ ako textový wordmark (bold, Poppins). Aktívna položka: žltý akcent (žltý ľavý border/pill + žltý text alebo žltá plocha s čiernym textom). Neaktívne: sivobiele. Nahraď emoji ikony čistými SVG ikonami (inline, bez novej závislosti — napr. jednoduché 24px stroke ikony).
- **Primárne tlačidlá:** žltá `#FFD52E` s **čiernym** textom (žltá + biely text nemá kontrast!), hover tmavšia žltá `#F1B51E`. Sekundárne: biele s čiernym borderom. Deštruktívne: červený outline.
- **KPI karty (dashboard):** biele karty, veľké čierne čísla (Poppins bold), malý sivý label; jemný žltý detail (napr. tenká horná linka alebo ikona).
- **Badge/stavy:** zelená = pozitívne (Hotová, Uhradená, OK), žltá = rozpracované (Naplánovaná, Nová, Vo výrobe), červená = problém (Nízky stav, Po splatnosti, Exspirovaná), sivá = neutrálne (Zrušená, Storno). Zachovaj existujúcu logiku, zmeň len farby/štýl.
- **Tabuľky:** čisté — biele riadky, jemný `#F5F5F4` header alebo len spodné bordery, hover riadku, tabular-nums na číslach (už je). Hustotu zachovaj — je to pracovný nástroj.
- **Formuláre:** biele inputy, čierny focus ring alebo žltý focus akcent, konzistentné rozostupy.
- **Login:** tu sa môže brand rozohrať najviac — čierne pozadie, žltý akcent, wordmark, tagline „Nie je to len shot. Je to rozhodnutie!“ ako podtitul.
- **Zaoblenie/tiene:** jednotne `rounded-xl`, tiene takmer žiadne (jemný border > tieň).

**Implementačne:** definuj tokeny v `globals.css` cez Tailwind v4 `@theme` (`--color-brand-*`), použi ich konzistentne; fonty cez `next/font` v root layoute. Vytiahnutie opakovaných vzorov (tlačidlo, badge, input trieda) do malých komponentov v `src/components/` je vítané.

## 4. Rozsah

Všetky existujúce obrazovky: login, shell/sidebar, dashboard, sklad (+pohyby), výroba (+nová šarža, receptúry, editor), plán, objednávky/financie/klienti/konkurencia (zatiaľ placeholder stránky — zjednoť ich štýl). Ak medzičasom pribudli moduly Dev B, redesignuj aj tie.

**Nemeniť:** server actions, prisma, `src/lib/*` logiku, slovenské texty, routing, formulárové `name` atribúty (na tie sa viažu akcie a testy).

## 5. Workflow a overenie

- Branch `feat/redesign` → PR (viď `AGENTS.md`; pred začatím `git pull origin main`)
- `npx tsc --noEmit` a `npm run build` musia prejsť
- Prekliknúť v prehliadači: login → dashboard → sklad (vytvoriť pohyb) → výroba (vytvoriť + dokončiť šaržu) → plán (uložiť cieľ) — všetko musí fungovať ako pred redesignom
- Skontrolovať kontrast (žltá vždy s čiernym textom), responsivitu aspoň po ~1024px šírku
- Do PR priložiť screenshoty pred/po (login, dashboard, sklad, výroba)
