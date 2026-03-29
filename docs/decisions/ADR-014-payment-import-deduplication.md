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

- Rzadki przypadek **dwóch rzeczywistych wpłat tego samego dnia** na jeden lokal z tego samego kanału importu — druga zostanie uznana za duplikat; obejście: ręczny wpis lub inna data w arkuszu.
- Reguła „cały wiersz zbiorczy odrzucony” może wymagać ręcznego rozstrzygnięcia, gdy tylko część lokali ma kolizję daty.

## Powiązane pliki

- [[../../api/routes/import_routes.py]] — `import_payments`, `import_bank_statement`
- Testy: [[../../api/tests/test_import_payments.py]], [[../../api/tests/test_bank_statement_parser.py]]

## Powiązania

- [[ADR-013-billing-groups]] — wpłaty parent/child przy imporcie zbiorczym
- [[../architecture/feature-map]] — panel Lokale, importy
