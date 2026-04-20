-- Widok globalnych dat ostatnich importów wpłat.
-- Cel: mieszkaniec widzi „Saldo na dzień: …” uwzględniające datę ostatniego
-- zestawienia bankowego / importu xlsx, nawet jeśli w tym imporcie nie było
-- wpłaty na jego lokal. RLS na `payments` ogranicza widok lokalu tylko do
-- własnego, ale fakt importu (sama data) nie jest wrażliwy — widok
-- udostępnia wyłącznie dwa timestampy, bez kwot i lokali.

CREATE OR REPLACE VIEW last_import_activity AS
SELECT
  (SELECT MAX(created_at) FROM payments WHERE title = 'Wpłata z zestawienia bankowego') AS last_bank_import_at,
  (SELECT MAX(created_at) FROM payments WHERE title IN ('Wpłata z dnia', 'Import zbiorczy')) AS last_excel_import_at;

-- security_invoker=off (domyślne) — widok działa z uprawnieniami właściciela,
-- dzięki czemu obchodzi RLS `payments` i zwraca globalne max niezależnie od
-- tego, czyje wpłaty są widoczne użytkownikowi.

GRANT SELECT ON last_import_activity TO authenticated;
