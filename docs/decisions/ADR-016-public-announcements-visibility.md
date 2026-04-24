# ADR-016: Jawność ogłoszeń na stronie publicznej

**Status:** Przyjęty  
**Data:** 2026-04-04

## Kontekst
Ogłoszenia (`announcements`) są wspólne dla panelu mieszkańca i treści pokazywanych gościom (strona główna, `/aktualnosci`). Część treści (np. auto-ogłoszenia o głosowaniu) ma sens tylko po zalogowaniu.

## Decyzja
- Kolumna **`is_public`** (`boolean`): wpisy z `true` są widoczne na stronie publicznej; z `false` — tylko dla zalogowanych (panel).
- **RLS** (`021_announcements_is_public.sql`): bez sesji (`anon`) SELECT tylko `is_public = true`; z sesją — pełna lista.
- **Frontend** publiczny (`loadPublicAnnouncements`) zawsze filtruje `.eq('is_public', true)` — spójnie także dla użytkownika zalogowanego na `/` i `/aktualnosci`.
- **Domyślna wartość** przy nowym wpisie z panelu: **`false`** (`022_announcements_is_public_default_false.sql` — `DEFAULT false`); admin zaznacza jawność ręcznie.
- **Auto-ogłoszenia** przy starcie głosowania (`api/routes/resolutions.py`) — **`is_public: false`** (treść kieruje do panelu).

## Powiązania
- [[ADR-002-rls-bezpieczenstwo]]
- [[ADR-004-data-access-pattern]]
