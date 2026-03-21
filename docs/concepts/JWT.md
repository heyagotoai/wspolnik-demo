# JWT (JSON Web Token)

Token uwierzytelniający wydawany przez [[Supabase]] Auth po zalogowaniu.

## Rola w projekcie
- Po zalogowaniu Supabase zwraca JWT z `user.id` (UUID)
- Frontend wysyła JWT w każdym zapytaniu do Supabase (automatycznie przez SDK)
- [[RLS]] używa `auth.uid()` (wyciąganego z JWT) do filtrowania danych
- Przy zapytaniach do [[FastAPI]] — JWT jest dodawany ręcznie w headerze `Authorization: Bearer`

## Ważne
- JWT NIE zawiera roli (admin/resident) — rola jest w tabeli `residents`, sprawdzana przez `is_admin()`
- Token wygasa — `onAuthStateChange` w [[ADR-003-auth-pattern|useAuth]] nasłuchuje odświeżenia

## Powiązania
- [[Supabase]] — wydaje tokeny
- [[ADR-003-auth-pattern]] — jak frontend zarządza sesją
- [[ADR-004-data-access-pattern]] — JWT przekazywany do FastAPI
