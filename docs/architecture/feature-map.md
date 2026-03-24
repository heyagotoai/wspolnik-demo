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
| Lokale | `/admin/lokale` | CRUD lokali: numer, m², udział, mieszkańcy, saldo początkowe + data salda, przypisanie właściciela. Hurtowe ustawianie daty salda. Wydruk salda (portal + `saldo-printing`, jedna strona). Wysyłka salda PDF emailem (załącznik z logo, krótki cover text). Auto-scroll do formularza edycji |
| Ogłoszenia | `/admin/ogloszenia` | CRUD + przypinanie |
| Dokumenty | `/admin/dokumenty` | Upload PDF (max 10MB) + public/private toggle |
| Terminy | `/admin/terminy` | CRUD z opisami |
| Naliczenia | `/admin/naliczenia` | Zakładki: Naliczenia (generowanie + regeneracja z force, ręczne) / Stawki (CRUD z wersjonowaniem). Wzory: eksploatacja/fundusz = m² × stawka, śmieci = osoby × stawka. Sumy per typ + zbiorcza. Ostrzeżenie przy generowaniu za miesiąc objęty saldem początkowym |
| Uchwały | `/admin/uchwaly` | CRUD uchwał, workflow statusów (draft→voting→closed), wyniki głosowania, eksport PDF (podsumowanie + lista głosów per mieszkaniec) |
| Wiadomości | `/admin/wiadomosci` | Podgląd wiadomości kontaktowych, oznaczanie jako przeczytane |

## Roadmapa — przed produkcją

### Faza: Hardening (wymagane przed wdrożeniem)
| Zadanie | Status | Priorytet | Opis |
|---------|--------|-----------|------|
| Testy izolacji RLS (FastAPI) | ✅ done | KRYTYCZNY | 55 testów: auth, role, izolacja danych, privilege escalation, reset głosów |
| Pentest RLS na żywej bazie | ⬜ todo | KRYTYCZNY | Zaloguj się jako mieszkaniec, spróbuj odczytać dane innego (DevTools/curl). Sprawdź: charges, payments, apartments, votes, residents, storage |
| Pentest IDOR frontend | ⬜ todo | KRYTYCZNY | Podmiana ID w URL/API calls, próba dostępu do cudzych zasobów |
| Audyt XSS/injection | ⬜ todo | KRYTYCZNY | Wstrzyknięcie HTML/JS w formularzach (kontakt, profil, ogłoszenia) |
| Naprawa: votes DELETE policy | ✅ done | WYSOKI | RLS policy `votes_delete_admin` + endpoint `DELETE /resolutions/:id/votes` + UI z podwójnym potwierdzeniem (wymóg wpisania "USUŃ") |
| Naprawa: contact_messages spam | ✅ done | WYSOKI | Rate limiting: max 5 wiadomości/godz per email — RLS policy + FastAPI check, komunikat 429 |
| CI/CD pipeline | ⬜ todo | WYSOKI | GitHub Actions: npm test + pytest na push, gating deploymentu |
| Testy E2E | ⬜ todo | WYSOKI | Playwright/Cypress: kluczowe ścieżki użytkownika (logowanie, głosowanie, finanse) |
| Testy obciążeniowe | ⬜ todo | ŚREDNI | Symulacja wielu mieszkańców jednocześnie (głosowanie, naliczenia) |
| Backup & recovery | ⬜ todo | WYSOKI | Strategia backupów Supabase, procedura przywracania |

### Faza: Dokumentacja operacyjna
| Zadanie | Status | Priorytet | Opis |
|---------|--------|-----------|------|
| Instrukcja wdrożeniowa | ✅ done | WYSOKI | `docs/operations/01-wdrozenie.md` — Supabase, Vercel, DNS, env vars, migracje |
| Instrukcja utrzymania | ✅ done | WYSOKI | `docs/operations/02-utrzymanie.md` — monitoring, debugowanie, backup, cron, limity |
| Instrukcja dla admina | ⬜ todo | ŚREDNI | Jak używać panelu admina (dla zarządcy wspólnoty, nie-technicznego) |
| Procedury awaryjne | ✅ done | ŚREDNI | `docs/operations/03-procedury-awaryjne.md` — awarie, rollback, utrata danych |

### Faza: Brakujące funkcjonalności
| Zadanie | Status | Priorytet | Opis |
|---------|--------|-----------|------|
| SMTP email | ✅ done | WYSOKI | Edge Function send-email działa, SMTP az.pl skonfigurowany, test wysyłki potwierdzony (2026-03-24) |
| Import bankowy (MT940) | ⏸ czeka | WYSOKI | Czeka na format eksportu z banku (~koniec marca 2026) |
| Audit log | ⬜ todo | WYSOKI | Logowanie operacji finansowych (RODO wymóg) |
| Retencja danych | ⬜ todo | ŚREDNI | Automatyczne usuwanie danych finansowych >5 lat |

### Faza: Komercjalizacja (po wdrożeniu u siebie)
| Zadanie | Status | Priorytet | Opis |
|---------|--------|-----------|------|
| Plan sprzedaży SaaS | ⬜ todo | ŚREDNI | Strategia multi-tenant: izolacja danych, onboarding, pricing, kanały dotarcia |
| Multi-tenancy | ⬜ todo | ŚREDNI | Architektura wielu wspólnot: osobne schematy / tenant_id / osobne projekty Supabase |
| Wielu mieszkańców na lokal | ⬜ todo | ŚREDNI | Współwłaściciele: kilku mieszkańców przypisanych do jednego lokalu (wymaga zmiany my_apartment_ids() i RLS) |
| Rola zarządcy | ⬜ todo | WYSOKI | Nowa rola "zarządca" z ograniczonymi prawami vs admin (np. podgląd finansów bez edycji stawek, brak CRUD mieszkańców/auth). Wymaga rozszerzenia CHECK constraint na residents.role i nowych RLS policies |
| Landing page B2B | ⬜ todo | NISKI | Strona sprzedażowa dla zarządców wspólnot |
| Demo / trial | ⬜ todo | NISKI | Środowisko demo z przykładowymi danymi |
| Regulamin i umowa SaaS | ⬜ todo | ŚREDNI | Dokumenty prawne: umowa, SLA, przetwarzanie danych (RODO) |

## Powiązania
- [[ADR-004-data-access-pattern]] — kiedy frontend vs backend
- [[ADR-002-rls-bezpieczenstwo]] — kto co widzi
- [[ADR-010-voting-system]] — system głosowania nad uchwałami
- [[ADR-012-charge-generation]] — automatyczne generowanie naliczeń
- [[system-overview]] — architektura techniczna
