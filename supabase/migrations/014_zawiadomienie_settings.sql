-- 014: Domyślny tekst podstawy prawnej dla zawiadomień o opłatach
INSERT INTO system_settings (key, value)
VALUES (
  'zawiadomienie_legal_basis',
  'Zarząd Wspólnoty Mieszkaniowej GABI, na podstawie uchwały nr 5/2023 z dnia 25.03.2023 oraz UCHWAŁY NR VI/74/24 RADY MIEJSKIEJ W CHOJNICACH z dnia 18.11.2024 ustanawia opłatę miesięczną:'
)
ON CONFLICT (key) DO NOTHING;
