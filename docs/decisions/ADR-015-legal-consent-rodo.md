# ADR-015: Zgody na politykę prywatności i regulamin (portal)

## Status
Zaakceptowane (2026-04-03)

## Kontekst
Portal przetwarza dane osobowe mieszkańców. Wymagana jest dokumentowana akceptacja obowiązujących dokumentów prawnych przed korzystaniem z panelu, oraz możliwość ponownego zebrania akceptacji po aktualizacji dokumentów.

Konta tworzy administrator — nie polegamy na „pierwszym logowaniu” z metadanych Supabase Auth; stan zgód jest w bazie (`residents`).

## Decyzja
1. **Kolumny w `residents`:** `privacy_accepted_at`, `terms_accepted_at`, `privacy_version`, `terms_version` (migracja `020_residents_legal_consent.sql`).
2. **Wersje obowiązujące:** `CURRENT_PRIVACY_VERSION` i `CURRENT_TERMS_VERSION` w konfiguracji backendu (np. env na Vercel) — **ustala wyłącznie serwer**. Gdy zapisana wersja różni się od aktualnej lub brak timestampów, `GET /api/profile` zwraca `needs_legal_acceptance: true`.
3. **Zapis zgód:** `POST /api/profile/legal-consent` z `{ accept_privacy, accept_terms }` (oba muszą być `true`); aktualizacja przez FastAPI + `service_role` (spójnie z [[ADR-004-data-access-pattern]] / [[ADR-002-rls-bezpieczenstwo]] — mieszkaniec nie ma bezpośredniego UPDATE na `residents` z klienta Supabase).
4. **UI:** `LegalConsentGate` owija `<Outlet />` w [[ADR-003-auth-pattern|ProtectedRoute]] i AdminRoute — ten sam wymóg dla admina i zarządcy.
5. **Wycofanie zgód:** nie jako „odznacz i dalej korzystaj”; na profilu informacja o zaakceptowanych wersjach + kanał kontaktu z administratorem (szczegóły produktowe w karcie / polityce).

## Konsekwencje
- Po zmianie treści PDF/MD — podbić odpowiednio `CURRENT_PRIVACY_VERSION` i/lub `CURRENT_TERMS_VERSION` (tylko dla zmienionego dokumentu) i wdrożyć backend; użytkownicy zostaną poproszeni o akceptację przy następnym wejściu. **Procedura krok po kroku:** [[02-utrzymanie]] (operacje — *Zmiana polityki prywatności lub regulaminu*).
- Testy: pytest (`test_profile.py`), Vitest (`ProtectedRoute`, `AdminRoute`, `ProfilePage`), Playwright (`helpers.acceptLegalConsentIfShown`).

## Powiązania
- [[ADR-002-rls-bezpieczenstwo]]
- [[ADR-003-auth-pattern]]
- [[ADR-004-data-access-pattern]]
