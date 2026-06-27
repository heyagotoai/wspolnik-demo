# ADR-014: Deduplikacja importów wpłat (Excel + zestawienie bankowe)

**Status:** Zaakceptowana  
**Data:** 2026-03-28

## Kontekst

Import wpłat może być uruchamiany wielokrotnie (podgląd → zastosuj, pomyłka, ten sam plik w kolejnym miesiącu). Bez kontroli duplikatów w bazie pojawiają się podwójne wpłaty i zafałszowane salda. Import z arkusza **Dopasowania** (.xlsx) początkowo nie sprawdzał istniejących rekordów; import z **zestawienia bankowego** (.xls) miał deduplikację wcześniej.

## Decyzja

**Jednolita reguła** dla obu ścieżek zapisu wpłat z importu:

1. **Klucz deduplikacji:** para `(apartment_id, payment_date)` — dzień księgowania (data z importu, bez czasu).
2. **Przed zapisem** ładowany jest zbiór istniejących par dla lokali z bazy (z tabeli `payments`, wiersze z ustawionym `apartment_id`).
3. **W trakcie przetwarzania jednego żądania** (pliku) zbiór jest **aktualizowany** po każdej zaakceptowanej wpłacie — podgląd (`dry_run=true`) i zapis (`dry_run=false`) zachowują tę samą kolejność i te same wyniki względem duplikatów *w pliku*.
4. **Import zbiorczy** (wiele lokali w jednej operacji — parent + rozbicie): jeśli **którykolwiek** z objętych lokali ma już wpłatę w tym dniu, **cała** operacja jest pomijana (spójnie z logiką „jedna transakcja bankowa → jeden zapis rozbity”).
5. **Kwota nie wchodzi do klucza** — świadomie: rozbicia mają inne kwoty niż wpłata nadrzędna; dwa przelewy w tym samym dniu na ten sam lokal wymagają wtedy ręcznej korekty lub innej daty księgowej.

## Konsekwencje

### Pozytywne

- Bezpieczny ponowny import tego samego pliku — duplikaty trafiają do statusu „pominięty” z komunikatem.
- Spójność UX między **Importuj wpłaty** (Excel) a **Import z banku (.xls)**.

### Negatywne / ograniczenia

- Rzadki przypadek **dwóch rzeczywistych wpłat tego samego dnia** na jeden lokal z tego samego kanału importu — druga zostanie uznana za duplikat; obejście: ręczny wpis w panelu Lokale → Wpłaty (komunikat duplikatu wskazuje tę ścieżkę).
- Reguła „cały wiersz zbiorczy odrzucony” może wymagać ręcznego rozstrzygnięcia, gdy tylko część lokali ma kolizję daty.

## Aktualizacja (2026-05-16): ręczne przypisanie niedopasowanych w `.xls`

Endpoint `POST /api/import/payments-bank-statement` przyjmuje opcjonalny parametr `manual_assignments` (JSON `{row_index: [apartment_id,...]}`). Niedopasowane transakcje z mapy są **konwertowane na `MatchedPayment`** (`match_details="Ręczne przypisanie"`, `confidence=1.0`) i przechodzą przez tę samą logikę co auto-dopasowane:

- **dedup po `(apartment_id, payment_date)`** — bez wyjątku dla ręcznych (świadoma decyzja: admin nadal nie nadpisze istniejącej wpłaty w tym samym dniu);
- **split** dla wielu lokali — proporcjonalny do sum naliczeń miesiąca przy wspólnej grupie rozliczeniowej, w pozostałych przypadkach równy;
- pole `manual_matched_count` w odpowiedzi (`ImportBankStatementResult`) zlicza, ile z `matched` pochodzi z ręcznego przypisania (UI pokazuje to na ekranie podsumowania).

## Powiązane pliki

- [[../../api/routes/import_routes.py]] — `import_payments`, `import_bank_statement`
- Testy: [[../../api/tests/test_import_payments.py]], [[../../api/tests/test_bank_statement_parser.py]]

## Powiązania

- [[ADR-013-billing-groups]] — wpłaty parent/child przy imporcie zbiorczym
- [[../architecture/feature-map]] — panel Lokale, importy
