-- Trigger WYCOFANY — tworzenie residents obsługuje FastAPI endpoint POST /api/residents.
-- Trigger powodował błąd "Database error creating new user" przy admin.create_user().
--
-- Jeśli trigger istnieje w bazie, usuń go:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
