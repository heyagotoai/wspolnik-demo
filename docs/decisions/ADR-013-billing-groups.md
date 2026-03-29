# ADR-013: Grupy rozliczeniowe (Billing Groups)

**Status:** Zaakceptowana
**Data:** 2026-03-28

## Kontekst

Niektórzy mieszkańcy posiadają wiele lokali i rozliczają się całościowo — jedna wpłata za wszystkie lokale. System zakładał dotychczas relację 1:1 (lokal ↔ mieszkaniec). Potrzebujemy elastycznego mechanizmu grupowania lokali.

## Decyzja

Wprowadzamy **grupy rozliczeniowe** (`billing_groups`) jako elastyczną warstwę agregacji ponad istniejącym modelem per-lokal.

### Kluczowe elementy:

1. **Tabela `billing_groups`** — encja pierwszej klasy z nazwą, tworzona przez admina
2. **`apartments.billing_group_id`** — opcjonalny FK; `NULL` = lokal nie w grupie (backward compatible)
3. **Model wpłat parent-child** — wpłata grupowa zapisywana jako parent (`apartment_id=NULL`), z child payments rozbitymi proporcjonalnie po lokalach
4. **Proporcje rozbicia** — na podstawie naliczeń za dany miesiąc; fallback: równy podział
5. **`my_apartment_ids()` rozszerzone** o `UNION` z lokalami z grupy rozliczeniowej

### Czego NIE zmieniamy:

- Naliczenia nadal generowane per-lokal (zależą od `area_m2`, `declared_occupants`)
- Formuła salda per-lokal: `initial_balance + payments - charges` — bez zmian
- PDF-y salda per-lokal — bez zmian (grupowy PDF odłożony)
- RLS: istniejące polityki na `charges` i `payments` automatycznie obsługują grupy dzięki `my_apartment_ids()`

## Konsekwencje

### Pozytywne:
- Admin ma pełną kontrolę nad grupowaniem (elastyczne, nie automatyczne)
- Istniejące lokale bez grupy działają identycznie jak wcześniej
- Minimalna ingerencja w istniejący kod (głównie dodanie nowego modułu)
- Mieszkaniec widzi saldo łączne + rozbicie per-lokal

### Negatywne:
- Dodatkowa złożoność w `my_apartment_ids()` (UNION)
- Parent payments z `apartment_id=NULL` — wymaga uwagi w zapytaniach filtrujących
- Zmiana grupy w trakcie miesiąca nie powoduje retroaktywnych przeliczeń

## Powiązane pliki

- [[../../supabase/migrations/018_billing_groups.sql]]
- [[../../api/routes/billing_groups.py]]
- [[../../site/src/pages/admin/BillingGroupsPage.tsx]]
- [[../../site/src/pages/resident/FinancesPage.tsx]]
- [[../architecture/feature-map]] — mapa funkcji (grupy + import Excel jako osobne pozycje)
