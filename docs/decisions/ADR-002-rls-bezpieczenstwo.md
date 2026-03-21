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

## Edge cases
- Głosy (`votes`) — brak UPDATE/DELETE policy = głosu nie da się zmienić ani cofnąć (celowe)
- Ogłoszenia (`announcements`) — publiczne, widoczne bez logowania
- Dokumenty — `is_public` flag decyduje o widoczności
