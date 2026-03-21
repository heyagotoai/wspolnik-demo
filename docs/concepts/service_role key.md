# Service Role Key

Klucz [[Supabase]] z pełnymi uprawnieniami — omija [[RLS]], ma dostęp do wszystkiego.

## Rola w projekcie
- Używany **wyłącznie** w [[FastAPI]] backend (`api/core/supabase_client.py`)
- Potrzebny do:
  - `auth.admin.create_user()` — tworzenie użytkowników
  - `auth.admin.delete_user()` — usuwanie użytkowników
  - Sprawdzanie roli admina w `security.py`

## Zasada bezpieczeństwa
**Service role key NIGDY nie może trafić do frontendu.** Frontend używa anon key + [[RLS]].

Gdyby service_role key wyciekł do kodu JS:
- Każdy mógłby zobaczyć/edytować/usunąć wszystkie dane
- RLS przestaje działać (service_role go omija)
- Pełny dostęp do auth.admin (tworzenie/usuwanie kont)

## Gdzie jest przechowywany
- `api/.env` → `SUPABASE_SERVICE_ROLE_KEY=...`
- `.env` jest w `.gitignore` — nigdy nie trafia do repo

## Powiązania
- [[ADR-004-data-access-pattern]] — service_role = FastAPI, anon key = frontend
- [[ADR-006-fastapi-struktura]] — singleton client z service_role
- [[Supabase]] — wydaje oba klucze (anon + service_role)
- [[SECURITY DEFINER]] — inne podejście do "obejścia" RLS (na poziomie SQL, nie klucza)
