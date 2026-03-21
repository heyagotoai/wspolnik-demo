# Supabase Storage

Przechowywanie plików (dokumenty PDF) w ramach [[Supabase]].

## Jak używamy w projekcie
- Admin uploaduje PDF → trafia do bucketu Storage
- Mieszkaniec pobiera przez `getPublicUrl()` → bezpośredni link

## Ważne: "public" bucket vs prywatność
- `getPublicUrl()` = URL dostępny **bez tokenu auth** — każdy kto zna URL, pobierze plik
- Kontrolujemy widoczność linku przez flagę `is_public` w tabeli `documents` + [[RLS]]
- Ale sam plik jest technicznie dostępny jeśli ktoś zgadnie URL

## Przyszłe ulepszenie
Dla prawdziwie prywatnych dokumentów (np. indywidualne rozliczenia):
- Prywatny bucket + `createSignedUrl()` = tymczasowy link z wygasaniem
- Wymaga zmiany w komponencie DocumentsPage

## Powiązania
- [[Supabase]] — część ekosystemu
- [[ADR-004-data-access-pattern]] — frontend pobiera bezpośrednio
- [[ADR-002-rls-bezpieczenstwo]] — RLS chroni metadane w tabeli, nie sam plik
