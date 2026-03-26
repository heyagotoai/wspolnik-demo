# ADR-003: Pattern uwierzytelniania (Context API + Hooki)

**Status:** Przyjęty
**Data:** 2026-03-15

## Kontekst
Potrzebujemy globalnego stanu logowania dostępnego w całej aplikacji React — aby chronić trasy, wyświetlać dane usera i zarządzać sesją.

## Decyzja
- `useAuth` hook z Context API — globalny stan sesji (user, loading, signIn, signOut)
- `useRole` hook — osobny, pobiera rolę z tabeli `residents` przez [[Supabase]] RLS
- `ProtectedRoute` — wrapper wymagający zalogowania → przekierowuje na `/logowanie`
- `AdminRoute` — wrapper wymagający roli admin → przekierowuje na `/panel`

## Dlaczego
- Context API wystarczy — nie potrzebujemy Redux/Zustand dla prostego stanu auth
- Osobny hook `useRole` bo rola siedzi w bazie (`residents`), nie w JWT — separacja odpowiedzialności
- `onAuthStateChange` nasłuchuje zmiany sesji w real-time (np. wygaśnięcie tokenu)

## Edge cases
- Loading state — bez niego komponent mógłby przekierować zanim sesja się załaduje
- User bez rekordu w `residents` — `useRole` zwraca null (nie crashuje)
- [[ADR-002-rls-bezpieczenstwo|RLS]] chroni dane nawet jeśli ktoś obejdzie frontend routing

## Obsługa wygasłych sesji (2026-03-26)
- Wygasły refresh token / 401 z API → automatyczny signOut + redirect na `/logowanie` + toast
- Mechanizm: flaga `session_expired` w `sessionStorage`, odczytywana przez `LoginPage`
- `useAuth` wykrywa: (1) error z `getSession()`, (2) nieoczekiwany event `SIGNED_OUT`
- `api.ts` wykrywa: status 401 → czyści cache headerów, signOut, ustawia flagę
- Celowe wylogowanie (`signOut`) ustawia ref `signingOut` — nie triggeruje toasta
- `sessionStorage` (per-tab) — wygaśnięcie w jednej zakładce nie wpływa na inne
