# Mapa Funkcjonalności — WM Gabi

## Strona publiczna (bez logowania)
| Strona | Route | Opis |
|--------|-------|------|
| Strona główna | `/` | Hero, karty szybkiego dostępu, ostatnie ogłoszenia |
| O nas | `/o-nas` | Opis wspólnoty, wartości, działania |
| Aktualności | `/aktualnosci` | Przypięte + zwykłe ogłoszenia, ważne daty |
| Dokumenty | `/dokumenty` | Publiczne dokumenty z filtrowaniem kategorii |
| Kontakt | `/kontakt` | Formularz, dane kontaktowe, numery alarmowe |

## Panel mieszkańca (wymaga logowania → [[ADR-003-auth-pattern|ProtectedRoute]])
| Strona | Route | Dane z Supabase |
|--------|-------|-----------------|
| Dashboard | `/panel` | Statystyki, ostatnie ogłoszenia, nadchodzące daty |
| Ogłoszenia | `/panel/ogloszenia` | Pełna lista z rozwijaniem treści |
| Dokumenty | `/panel/dokumenty` | Download z Supabase Storage |
| Terminy | `/panel/terminy` | Nadchodzące daty z odliczaniem |
| Finanse | `/panel/finanse` | ⏳ Placeholder — czeka na integrację bankową |

## Panel admina (wymaga roli admin → [[ADR-003-auth-pattern|AdminRoute]])
| Strona | Route | Operacje |
|--------|-------|----------|
| Dashboard | `/admin` | Statystyki: mieszkańcy, lokale, ogłoszenia, dokumenty |
| Mieszkańcy | `/admin/mieszkancy` | CRUD przez [[FastAPI]] (tworzenie/usuwanie) + Supabase (edycja) |
| Ogłoszenia | `/admin/ogloszenia` | CRUD + przypinanie |
| Dokumenty | `/admin/dokumenty` | Upload PDF (max 10MB) + public/private toggle |
| Terminy | `/admin/terminy` | CRUD z opisami |
| Naliczenia | `/admin/naliczenia` | Dodawanie naliczeń per lokal per miesiąc |

## Powiązania
- [[ADR-004-data-access-pattern]] — kiedy frontend vs backend
- [[ADR-002-rls-bezpieczenstwo]] — kto co widzi
- [[system-overview]] — architektura techniczna
