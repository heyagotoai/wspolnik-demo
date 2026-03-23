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
| Ogłoszenia | `/panel/ogloszenia` | Pełna lista z rozwijaniem treści; badge "Nowe" (localStorage); krótkie → przeczytane od razu, długie → po rozwinięciu |
| Dokumenty | `/panel/dokumenty` | Download z Supabase Storage |
| Terminy | `/panel/terminy` | Nadchodzące daty z odliczaniem + terminy głosowań (nieodgłosowane uchwały), wyróżnione wizualnie |
| Finanse | `/panel/finanse` | Saldo, naliczenia miesięczne, historia wpłat; lookup lokalu przez owner_resident_id lub apartment_number (fallback) |
| Głosowania | `/panel/glosowania` | Lista uchwał (voting/closed), oddawanie głosów, wyniki |
| Profil | `/panel/profil` | Dane mieszkańca, zmiana hasła |

## Panel admina (wymaga roli admin → [[ADR-003-auth-pattern|AdminRoute]])
| Strona | Route | Operacje |
|--------|-------|----------|
| Dashboard | `/admin` | Statystyki: mieszkańcy, lokale, ogłoszenia, dokumenty |
| Mieszkańcy | `/admin/mieszkancy` | CRUD przez [[FastAPI]] (tworzenie/usuwanie) + Supabase (edycja). Auto-sync owner_resident_id przy tworzeniu/usuwaniu. Auto-scroll do formularza edycji |
| Lokale | `/admin/lokale` | CRUD lokali: numer, m², udział, mieszkańcy, saldo początkowe + data salda, przypisanie właściciela. Hurtowe ustawianie daty salda. Auto-scroll do formularza edycji |
| Ogłoszenia | `/admin/ogloszenia` | CRUD + przypinanie |
| Dokumenty | `/admin/dokumenty` | Upload PDF (max 10MB) + public/private toggle |
| Terminy | `/admin/terminy` | CRUD z opisami |
| Naliczenia | `/admin/naliczenia` | Zakładki: Naliczenia (generowanie + regeneracja z force, ręczne) / Stawki (CRUD z wersjonowaniem). Wzory: eksploatacja/fundusz = m² × stawka, śmieci = osoby × stawka. Sumy per typ + zbiorcza. Ostrzeżenie przy generowaniu za miesiąc objęty saldem początkowym |
| Uchwały | `/admin/uchwaly` | CRUD uchwał, workflow statusów (draft→voting→closed), wyniki głosowania, eksport PDF (podsumowanie + lista głosów per mieszkaniec) |
| Wiadomości | `/admin/wiadomosci` | Podgląd wiadomości kontaktowych, oznaczanie jako przeczytane |

## Powiązania
- [[ADR-004-data-access-pattern]] — kiedy frontend vs backend
- [[ADR-002-rls-bezpieczenstwo]] — kto co widzi
- [[ADR-010-voting-system]] — system głosowania nad uchwałami
- [[ADR-012-charge-generation]] — automatyczne generowanie naliczeń
- [[system-overview]] — architektura techniczna
