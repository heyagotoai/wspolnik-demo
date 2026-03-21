# SECURITY DEFINER

Atrybut funkcji PostgreSQL oznaczający, że funkcja wykonuje się z uprawnieniami **twórcy** (owner), nie wywołującego.

## Dlaczego potrzebujemy tego w projekcie
Funkcje `is_admin()` i `my_apartment_ids()` muszą odczytać tabelę `residents`, która jest chroniona przez [[RLS]]. Bez `SECURITY DEFINER`:
1. User wywołuje zapytanie → RLS sprawdza politykę
2. Polityka wywołuje `is_admin()` → `is_admin()` próbuje odczytać `residents`
3. `residents` ma RLS → sprawdza politykę → wywołuje `is_admin()` → **zapętlenie**

Z `SECURITY DEFINER` funkcja "przebija się" przez RLS bo działa jako superuser.

## Ryzyko
Funkcja `SECURITY DEFINER` to "escape hatch" — omija zabezpieczenia. Dlatego:
- Używamy jej TYLKO w helperach RLS
- Funkcje są `STABLE` (nie modyfikują danych)
- Logika jest minimalna (proste SELECT)

## Powiązania
- [[RLS]] — kontekst użycia
- [[ADR-002-rls-bezpieczenstwo]] — implementacja
