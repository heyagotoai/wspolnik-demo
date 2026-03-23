# ADR-012: Automatyczne generowanie naliczeń

## Status
Zaakceptowane (2026-03-22)

## Kontekst
Admin dodawał naliczenia ręcznie, po jednym. Przy 10+ lokalach × 3 składniki miesięcznie to ponad 30 wpisów. Potrzebny system stawek i automatycznego generowania.

## Decyzja

### Model naliczeń
Wspólnota rozlicza trzy składniki:
- **Eksploatacja** = metraż lokalu (m²) × stawka za m²
- **Fundusz remontowy** = metraż lokalu (m²) × stawka za m²
- **Wywóz śmieci** = zadeklarowana liczba osób × stawka za osobę

Woda, gaz, prąd — rozliczane bezpośrednio przez dostawców, poza wspólnotą.

### Stawki z wersjonowaniem (snapshot)
- Tabela `charge_rates` z `valid_from` (data obowiązywania)
- Przy generowaniu naliczeń system bierze najnowszą stawkę z `valid_from ≤ miesiąc`
- Wygenerowane naliczenie zapisuje **kwotę końcową** — zmiana stawki nie przelicza przeszłych miesięcy
- UNIQUE constraint na `(type, valid_from)` zapobiega duplikatom

### Flaga `is_auto_generated`
- Kolumna w tabeli `charges` rozróżnia automatyczne od ręcznych
- Zabezpiecza przed podwójnym generowaniem (409 Conflict)
- Wyświetlana w UI jako badge "Auto" / "Ręczne"

### Generowanie (admin)
- Endpoint `POST /api/charges/generate` — admin podaje miesiąc
- System oblicza naliczenia dla wszystkich lokali z aktualnymi stawkami
- Pomija lokale bez powierzchni (eksploatacja/fundusz) lub z 0 mieszkańców (śmieci) + zwraca warnings
- Zaokrąglanie: `ROUND_HALF_UP` do 2 miejsc dziesiętnych
- Po wygenerowaniu admin może dodać jednorazowe pozycje ręcznie (typ `inne`)

### Regeneracja naliczeń
- Parametr `force: true` w `POST /api/charges/generate` umożliwia przeliczenie istniejących naliczeń
- Usuwa tylko naliczenia z `is_auto_generated=true` — ręczne naliczenia pozostają nietknięte
- Frontend: jeśli naliczenia za dany miesiąc istnieją, dialog potwierdzenia z opcją „Aktualizuj"
- Odpowiedź zawiera `regenerated: bool` — UI wyświetla „Zaktualizowano" zamiast „Wygenerowano"

### Ochrona przed podwójnym naliczeniem (data salda)
- Pole `apartments.initial_balance_date` (migracja 011) — na jaki dzień obowiązuje saldo początkowe
- Przy generowaniu naliczeń: ostrzeżenie jeśli miesiąc ≤ data salda (np. saldo na 2026-03-01 + naliczenie za 03/2026)
- Nie blokuje generowania — admin generuje świadomie, system ostrzega
- Hurtowe ustawianie daty: baner na stronie Lokale dla lokali bez daty + formularz bulk update

### Zmiany w schemacie
- Nowa tabela: `charge_rates` (migracja 008)
- `apartments.declared_occupants` — liczba zadeklarowanych osób
- `apartments.initial_balance_date` — data salda początkowego (migracja 011)
- `charges.is_auto_generated` — flaga auto/ręczne
- Usunięcie typów `woda`/`ogrzewanie` z CHECK constraint (nieużywane)

### Auto-generowanie (cron)
- Tabela `system_settings` z kluczami `auto_charges_enabled` i `auto_charges_day`
- Vercel Cron Job codziennie o 6:00 UTC → endpoint `POST /api/charges/cron`
- Endpoint sprawdza: czy włączone, czy dziś odpowiedni dzień, czy nie wygenerowano już
- Chroniony przez `CRON_SECRET` (zmienna środowiskowa Vercel)
- Domyślnie **wyłączone** — admin włącza toggle w UI

## Konsekwencje
- Admin zarządza stawkami i generuje naliczenia jednym kliknięciem
- Opcjonalnie: auto-generowanie w wybranym dniu miesiąca
- Regeneracja naliczeń bez ręcznego usuwania — po zmianie danych lokali/stawek
- Ochrona przed podwójnym naliczeniem dzięki dacie salda początkowego
- Stawki mają historię — widać kiedy i jakie stawki obowiązywały
- Ręczne naliczenia nadal możliwe (jednorazowe opłaty)
- Mieszkaniec widzi w panelu Finanse wszystkie naliczenia (auto + ręczne)
- Podsumowanie naliczeń: sumy per typ (eksploatacja/fundusz/śmieci) + suma zbiorcza
