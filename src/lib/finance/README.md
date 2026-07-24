# Financie v2 — spoločné jadro

Tento adresár obsahuje iba stabilné doménové kontrakty a implementáciu
developera A. Provider adaptéry sú oddelené podľa vlastníctva:

- developer B: `documents/`, `mail/`, `import/omega/`,
- developer C: `banking/`, `matching/`.

Kým A1 neprepne existujúce obrazovky, `Invoice.status` zostáva legacy
kompatibilným poľom. Nový kód používa:

- `Invoice.documentStatus` pre životný cyklus dokladu,
- súčet aktívnych `PaymentAllocation` pre stav úhrady,
- `Invoice.invoiceNumber = null` pre koncept a číslo až po finalizácii.

Zmenu kontraktu alebo Prisma schémy robí developer A v samostatnom malom PR.
