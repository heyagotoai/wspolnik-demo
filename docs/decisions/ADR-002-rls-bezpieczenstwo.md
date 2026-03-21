# ADR-002: Row Level Security jako fundament bezpieczeństwa

**Status:** Przyjęty
**Data:** 2026-03-15

## Kontekst
System przechowuje dane osobowe mieszkańców (RODO), salda finansowe, głosowania. Potrzebujemy pewności, że mieszkaniec A nigdy nie zobaczy danych mieszkańca B.

## Decyzja
Bezpieczeństwo oparte na [[Supabase]] RLS z dwoma helperami:
- `is_admin()` — sprawdza rolę admina
- `my_apartment_ids()` — zwraca lokale należące do zalogowanego usera

Polityki opisane w [[002_rls_policies.sql|migracji RLS]].

## Dlaczego
- RLS działa na poziomie bazy — nawet błąd w API nie ujawni cudzych danych
- Helpery `SECURITY DEFINER` = czytelne, reużywalne polityki
- Admin widzi wszystko, mieszkaniec tylko swoje — prosty model

## Kluczowy koncept: SECURITY DEFINER
Funkcje `is_admin()` i `my_apartment_ids()` muszą być `SECURITY DEFINER`, bo:
- Użytkownik normalnie nie ma dostępu do tabeli `residents` (chroniona przez RLS)
- Ale te funkcje muszą odczytać `residents` żeby sprawdzić rolę/lokale
- `SECURITY DEFINER` = funkcja działa z uprawnieniami **twórcy** (superuser), nie wywołującego
- Bez tego RLS blokowałby sam siebie (zapętlenie)

## Edge cases
- Głosy (`votes`) — brak UPDATE/DELETE policy = głosu nie da się zmienić ani cofnąć (celowe, chroni integralność głosowania)
- Ogłoszenia (`announcements`) — `USING (true)` = w pełni publiczne, każdy widzi wszystkie
- Dokumenty — dwa poziomy: niezalogowany widzi tylko `is_public = true`, zalogowany widzi wszystkie
