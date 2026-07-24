# Bankový modul — stav aktivácie

## Dostupné bez Tatra Premium API

- serverový import EUR CSV výpisu s náhľadom a deterministickou deduplikáciou,
- bankové transakcie a platby,
- automatické párovanie presný VS + suma + mena,
- automatické párovanie jednoznačný IBAN + suma + dátum,
- manuálne alokácie prijatých aj odchádzajúcich platieb,
- cash-flow a aging neuhradených faktúr,
- audit alokácií a ich reverzovanie.

## Blokátory zapnutia Tatra Premium API

`TATRA_PREMIUM_ENABLED` musí zostať `0`, kým nie sú splnené všetky body:

1. služba a aplikácia sú aktivované Tatra bankou,
2. je dostupná zmluvná verzia API kontraktu a sandbox credentials,
3. je implementovaný a overený OAuth consent/onboarding flow,
4. endpointy, schémy odpovedí, stránkovanie a rotácia tokenu prešli
   kontraktnými testami proti oficiálnemu sandboxu,
5. Railway variables obsahujú platné tajomstvá a 64-hex `BANK_TOKEN_KEY`,
6. cron je nastavený na 15 minút a odosiela aspoň 32-znakový `CRON_SECRET`,
7. bol vykonaný kontrolovaný sync bez zápisu a následný idempotentný re-run.

Súčasný `TatraPremiumApiProvider` je izolovaný adaptér a testovaná kostra. Nie je
dôkazom sandboxovej ani produkčnej kompatibility bez vyššie uvedeného overenia.
