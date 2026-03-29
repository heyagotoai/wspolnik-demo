# ADR-010: System głosowania nad uchwałami

## Status
Zaakceptowane (2026-03-21), uzupełnione 2026-03-29 (udziały, uprawnienia, UI), 2026-03-29 (głosy z zebrania), 2026-03-29 (układ paska akcji w panelu Uchwały)

## Kontekst
Wspólnota mieszkaniowa potrzebuje mechanizmu cyfrowego głosowania nad uchwałami. Schemat bazy (`resolutions`, `votes`) i polityki [[RLS]] zostały przygotowane w migracji 001/002. Brakowało implementacji API i UI.

## Decyzja

### Workflow uchwał (statusy)
1. **draft** (szkic) — admin tworzy uchwałę, mieszkańcy jej nie widzą
2. **voting** (głosowanie) — mieszkańcy mogą oddać głos
3. **closed** (zamknięta) — głosowanie zakończone, wyniki widoczne

Admin ręcznie zmienia status. W przyszłości można dodać automatyczne zamykanie na podstawie `voting_end`.

### Głosowanie
- Opcje: **za**, **przeciw**, **wstrzymuję się**
- Głos jest **jednorazowy** — brak możliwości zmiany (brak UPDATE policy w [[RLS]])
- Constraint UNIQUE(resolution_id, resident_id) + walidacja w API
- Głos można oddać tylko gdy status = `voting`

### Głosy z zebrania (osobiście przed publikacją)
- Część głosów bywa oddawana na zebraniu wspólnoty; przed włączeniem głosowania online admin **rejestruje te głosy w systemie** (te same rekordy w `votes` co głos z panelu).
- **API (tylko admin, backend `service_role`):** `POST /resolutions/:id/votes/register` z `{ resident_id, vote }` — wyłącznie gdy uchwała ma status **`draft`**; walidacja uprawnień jak przy `POST /vote` (`voting_eligibility`). `DELETE /resolutions/:id/votes/:resident_id` — usunięcie pojedynczego głosu, wyłącznie w **`draft`** (korekta przed publikacją).
- **Skutek:** `UNIQUE(resolution_id, resident_id)` — mieszkaniec z głosem z zebrania **nie może** oddać drugiego głosu online po przejściu uchwały w `voting`.
- **UI:** `/admin/uchwaly` — przy szkicu przycisk „Głosy z zebrania” (modal: lista, dodawanie, usuwanie). **Pasek akcji na karcie uchwały** (`site/src/pages/admin/ResolutionsPage.tsx`): kolejność od lewej — najpierw przycisk tekstowy „Głosy z zebrania” (tylko szkic, admin), potem **grupa ikon** w jednym rzędzie: reset wszystkich głosów (gdy są głosy, admin), **eksport PDF**, edycja uchwały, usunięcie — tak, by ikona pobrania PDF nie rozdzielała akcji tekstowej od pozostałych operacji.
- **Uwaga:** cofnięcie uchwały z `voting`/`closed` do `draft` nadal usuwa **wszystkie** głosy (istniejąca logika PATCH) — dotyczy też głosów wprowadzonych z zebrania.

### Architektura
- **Backend (FastAPI)**: pełny CRUD + głosowanie (`POST /resolutions/:id/vote`) + rejestracja głosów z zebrania (`POST /resolutions/:id/votes/register`) + usunięcie pojedynczego głosu w szkicu (`DELETE /resolutions/:id/votes/:resident_id`)
- **Frontend**: admin zarządza przez panel CRUD, mieszkaniec głosuje przyciskami
- Wyniki: pasek proporcji + liczby (za/przeciw/wstrzymuje); **procenty wg udziałów** — suma `apartments.share` dla lokali, których właścicielem jest głosujący (`owner_resident_id`), mianownik = suma udziałów wszystkich lokali (`total_share_community`). Wielu lokali jednego właściciela: udziały się sumują. Gdy **suma wag oddanych głosów = 0** (np. głosujący bez przypisanego lokalu jako właściciel), UI i PDF stosują **fallback: procenty jak udział w liczbie głosów** (`site/src/lib/voteResultsDisplay.ts` — `hasWeightedVoteShares`)
- **Uprawnienie do głosu:** `POST /vote` sprawdza `api/core/voting_eligibility.py`: rola `resident` (konto aktywne); **admin** i **manager** mogą głosować wyłącznie, jeśli istnieje lokal z `owner_resident_id` = dany użytkownik. **`GET/PATCH /profile`** zwraca `can_vote_resolutions` (ta sama reguła) — panel `/panel/glosowania` ładuje profil i pokazuje przyciski tylko gdy `true`
- Mieszkaniec widzi tylko swój głos (RLS `votes_select_own`), admin widzi wszystkie

### Bezpieczeństwo
- [[RLS]] zapewnia izolację głosów między mieszkańcami
- Brak UPDATE policy na `votes` — mieszkaniec nie zmienia głosu po oddaniu; **DELETE**: tylko admin (`votes_delete_admin`, migracja 012) — reset zbiorczy przez API; pojedyncze usunięcie w szkicu wyłącznie przez FastAPI (`service_role`)
- Mieszkaniec wstawia głos tylko za siebie — `votes_insert_own` (`resident_id = auth.uid()`). **Rejestracja głosu za mieszkańca** (np. głos z zebrania) jest możliwa wyłącznie przez endpoint admina z kluczem `service_role`, nie przez klienta Supabase jako zwykły użytkownik
- Wyniki agregowane przez API; szczegółowe głosy (kto jak głosował) dostępne dla admina i zarządcy przez `GET /resolutions/:id/votes` (`require_admin_or_manager`)

## Alternatywy rozważane
- **Głosowanie z możliwością zmiany** — odrzucone; w kontekście uchwał wspólnoty głos powinien być świadomy i ostateczny
- **Automatyczne zamykanie** — odłożone; wymaga cron job (Edge Functions lub zewnętrzny scheduler)
- **Głosowanie anonimowe** — odrzucone; w prawie wspólnot mieszkaniowych wymagana jest identyfikacja głosujących

## Konsekwencje
- Schemat DB nie wymaga zmian (tabele i RLS gotowe od migracji 001/002)
- Endpointy: m.in. lista, CRUD uchwały, wyniki, mój głos, oddanie głosu, lista głosów (admin/zarządca), reset głosów, **rejestracja głosu z zebrania**, **usunięcie pojedynczego głosu w szkicu** — szczegóły w `api/routes/resolutions.py`
- Strony: `/admin/uchwaly` (`ResolutionsPage.tsx` — modal głosów z zebrania, **układ paska akcji** zsynchronizowany z `CLAUDE.md`) + `/panel/glosowania`
- Eksport PDF wyników głosowania: podsumowanie (za/przeciw/wstrzymuje + %) + lista imiennych głosów sortowana po numerze lokalu (także gdy uchwała jest jeszcze w szkicu, ale są już wpisane głosy)
- Testy: pytest (`test_resolutions.py`, m.in. rejestracja/usunięcie w szkicu) + vitest (`ResolutionsPage.test.tsx`)

## Powiązania
- [[ADR-002-rls-bezpieczenstwo]] — polityki RLS dla votes/resolutions
- [[ADR-004-data-access-pattern]] — dane przez API (głosowanie) vs Supabase direct (odczyt listy)
- [[ADR-009-testing-strategy]] — wzorce testowe zastosowane do nowych endpointów
