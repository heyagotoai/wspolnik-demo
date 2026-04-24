-- Nowe ogłoszenia (INSERT bez jawnej wartości) — domyślnie tylko panel; jawność włącza admin

ALTER TABLE announcements
  ALTER COLUMN is_public SET DEFAULT false;
