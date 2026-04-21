# Karta produktu: 
## **System zarządzania wspólnotą mieszkaniową**

## 1. Przeznaczenie

Aplikacja webowa do obsługi małej wspólnoty mieszkaniowej: zastępuje rozproszone arkusze, papierowe głosowania i ręczne powiadomienia. Trzy warstwy: strona publiczna, panel mieszkańca, panel administracyjny (administrator i — w ograniczonym zakresie — zarządca). Typowo wdrażana na **dedykowanej domenie** wspólnoty.

**Skala docelowa:** rząd wielkości ~50 lokali/mieszkańców; administrator i rola zarządcy (ograniczony dostęp operacyjny).

---

## 2. Role użytkowników

| Rola | Kto | Uprawnienia |
|------|-----|-------------|
| Gość | Odwiedzający bez logowania | Strona publiczna, formularz kontaktowy |
| Mieszkaniec | Właściciel lokalu | Panel: finanse, głosowania, dokumenty itd. **Wyłącznie własne dane** |
| Zarządca | Osoba z ograniczonym mandatem | **Podgląd** (read-only): finanse, lokale, mieszkańcy, dokumenty, uchwały, wiadomości z kontaktu, dziennik operacji. **Pełny CRUD:** ogłoszenia (w tym jawność, wysyłka e‑mail ogłoszenia) i terminy. **Bez** m.in.: kont mieszkańców, edycji stawek, generowania/regeneracji naliczeń, importów, wysyłki salda PDF e‑mail i zawiadomień o opłatach |
| Administrator | Pełne prowadzenie systemu | CRUD mieszkańców, lokali, naliczeń, stawek, uchwał, dokumentów |

Konta mieszkańców **nie rejestrują się samodzielnie** — administrator tworzy konta (np. zaproszenie e‑mailem).

---

## 3. Zakres funkcjonalny

### 3.1 Strona publiczna (bez logowania)

- **Strona główna** — prezentacja wspólnoty (hero: logowanie, aktualności, kontakt), sekcja aktualności z ogłoszeniami oznaczonymi jako jawne (`is_public`); adresy `http(s)://` w treści jako klikalne linki
- **Aktualności** — lista tych samych jawnych ogłoszeń co na stronie głównej (pełniejsza); przypinanie ważnych
- **Dokumenty** — dokumenty publiczne do pobrania (kategorie); link „Dokumenty” w menu/stopce **dopiero po zalogowaniu** (gość może wejść z adresu URL)
- **Kontakt** — formularz (imię, e‑mail, nr mieszkania, temat, treść), dane wspólnoty, numery alarmowe
- **Stopka** — m.in. odniesienia do dokumentów prawnych

### 3.2 Panel mieszkańca

- **Dashboard** — saldo (nadpłata/zaległość), ogłoszenia, terminy, aktywne głosowania
- **Finanse**
  - Saldo: saldo początkowe + wpłaty − naliczenia (przy grupie rozliczeniowej: saldo łączne + rozbicie per lokal)
  - Naliczenia miesięczne (wybór miesiąca), historia wpłat
  - Wyróżnienie stanów: nadpłata / zaległość / rozliczone
- **Ogłoszenia** — pełna lista, rozwijanie treści, oznaczenie „nowe”
- **Dokumenty** — publiczne i prywatne
- **Terminy** — z odliczaniem; terminy aktywnych głosowań
- **Głosowania** — uchwały (aktywne/zamknięte), głosy (za/przeciw/wstrzymuję się), podgląd wyników
- **Profil** — dane osobowe, zmiana hasła; przy pierwszej sesji (lub po zmianie wersji dokumentów) akceptacja polityki prywatności i regulaminu; na profilu: zapisane wersje dokumentów, linki do PDF, informacja o kontakcie w sprawie danych osobowych

### 3.3 Panel administratora

Ten sam zestaw adresów URL co u zarządcy; **pełny zakres operacji** poniżej ma **administrator**. Szczegóły ograniczeń zarządcy — w tabeli ról (pkt 2).

- **Dashboard** — statystyki (mieszkańcy, lokale, ogłoszenia, dokumenty)
- **Mieszkańcy** — dodawanie (konto e‑mail/hasło), edycja, dezaktywacja, usuwanie; powiązanie z lokalem
- **Lokale** — CRUD: numer, m², udział %, liczba zameldowanych, właściciel, opcjonalna grupa rozliczeniowa, **nazwisko rozliczeniowe** (dopasowanie importu bankowego), saldo początkowe + data; zbiorcza data salda; **podgląd listy wpłat** lokalu; skrót **ostatnich importów** wpłat (bank / Excel)
- **Import stanu początkowego (Excel)** — szablon .xlsx, podgląd (dry-run), dopasowanie numerów (także złożone przypadki)
- **Import wpłat (Excel)** — arkusz dopasowań; wiele dat/kwot; wpłaty zbiorcze z podziałem; **deduplikacja** po parze (lokal, data)
- **Grupy rozliczeniowe** — zgrupowanie lokali, wpłaty grupowe, saldo łączne u mieszkańca
- **Ogłoszenia** — CRUD, przypinanie, **jawność na stronie głównej /aktualnosci** (pole `is_public`; domyślnie wyłączone — treść tylko w panelu mieszkańca; auto-ogłoszenia o głosowaniu — niepubliczne), **wysyłka e‑mail** do aktywnych mieszkańców
- **Dokumenty** — upload PDF (limit rozmiaru wg konfiguracji), publiczny/prywatny
- **Terminy** — CRUD
- **Naliczenia miesięczne** — generowanie per lokal i miesiąc; wzory (m², osoby); regeneracja z zachowaniem pozycji ręcznych; pozycje „inne”; stawki z datą obowiązywania; podsumowania; ostrzeżenie przy kolizji z saldem początkowym; **zawiadomienia o opłatach** — podgląd PDF, wysyłka e‑mail (pojedynczo i masowo), edycja podstawy prawnej, wybór miesiąca obowiązywania
- **Uchwały i głosowania** — stany: szkic → głosowanie → zamknięte; **głosy z zebrania** w szkicu (spójny model z głosem online); akcje w panelu (m.in. głosy z zebrania, reset, PDF, edycja, usuwanie, **wysyłka przypomnienia** do nieoddanych głosów); **automatyczne przypomnienia e‑mail** na 2 dni przed końcem głosowania (cron; pomija uchwały testowe i już wysłane); **tryb testowy** (`is_test`) — uchwała niewidoczna dla mieszkańców, bez auto-ogłoszenia, pomijana przez cron; powiadomienie przy otwarciu; wyniki (liczby i %); **eksport PDF** (także szkic z głosami)
- **Wiadomości** — wiadomości z formularza kontaktowego, oznaczanie przeczytanych
- **Dziennik operacji** — historia zmian finansowych i głosowań, filtry, szczegóły
- **Wydruk salda** — pismo z saldem, danymi konta, terminem lub informacją o nadpłacie
- **Powiadomienie e‑mail o saldzie** — wysyłka per mieszkaniec (załącznik PDF) oraz **masowa** z zaznaczeniem lokali
- **Import zestawienia bankowego (.xls)** — dopasowanie po **nazwisku rozliczeniowym** i numerze lokalu z opisu; dry-run; deduplikacja jak przy imporcie Excel; raport niedopasowań. **MT940** — opcjonalnie, gdy bank udostępnia (osobna ścieżka; status zależy od potwierdzenia formatu)

### 3.4 Powiadomienia e‑mail

- Masowa wysyłka ogłoszeń
- Saldo (indywidualnie i masowo, załącznik PDF)
- Zawiadomienia o opłatach (PDF, pojedynczo i masowo)
- Formularz kontaktowy → administrator
- Powiadomienie o wyniku **tygodniowego backupu** do administratorów (powodzenie / niepowodzenie)
- SMTP na domenie wspólnoty (konfiguracja wdrożeniowa)

<div style="break-before: page; page-break-before: always;"></div>

## 4. Bezpieczeństwo i zgodność

| Obszar | Założenia |
|--------|-----------|
| Autentykacja | E‑mail + hasło; brak publicznej samodzielnej rejestracji |
| Autoryzacja | Role (admin, zarządca, mieszkaniec); zabezpieczenie API |
| Izolacja danych | Mieszkaniec widzi wyłącznie dane swojego lokalu i powiązane rekordy |
| RODO/GDPR | Minimalizacja, prawo do usunięcia, ograniczenie danych w logach |
| Audit log | Rejestracja operacji finansowych i głosowań |
| Retencja | Usuwanie danych finansowych starszych niż uzgodniony horyzont (np. 5 lat), w ramach **zautomatyzowanego procesu** (cron) |
| Formularze publiczne | Ograniczenie nadużyć (rate limiting), ochrona przed typowymi atakami web |

---

## 5. Wymagania niefunkcjonalne (typowe)

| Obszar | Kierunek |
|--------|----------|
| Mobile | Responsywność (priorytet dla mieszkańców na telefonach) |
| Wydajność | Krótki czas pierwszego widoku; ruch rzędu kilkudziesięciu równoczesnych użytkowników dla małej wspólnoty |
| Dostępność usługi | Hosting z certyfikatem TLS; SLA zależne od wybranego dostawcy |
| Koszty | Możliwość utrzymania na warstwach darmowych lub niskich dla małej skali (np. hosting aplikacji + baza w modelu chmurowym) |
| Domena | Własna domena wspólnoty |
| Backup | Kopie po stronie dostawcy bazy; dodatkowo **tygodniowy eksport** wybranych tabel + metadanych do **magazynu plików** (np. JSON w bucketze), retencja plików np. **12 ostatnich tygodni**, powiadomienie e‑mail do adminów; udokumentowana procedura odtworzenia |
| Jakość | Testy automatyczne w pipeline; testy izolacji danych; przed produkcją zalecany przegląd bezpieczeństwa |

---

<div style="break-before: page; page-break-before: always;"></div>

## 6. Stack technologiczny (przykład wdrożenia)

System może być zrealizowany m.in. w następującym zestawie (konkretny wariant zależy od projektu wdrożeniowego):

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router
- **Backend:** FastAPI (Python), hosting serverless
- **Dane:** Supabase — PostgreSQL z Row Level Security, uwierzytelnianie z białą listą e‑mail, magazyn plików
- **E‑mail:** funkcja brzegowa jako relay SMTP do skrzynki na domenie wspólnoty

<p style="margin-top: 1.25em; page-break-inside: avoid; break-inside: avoid;"><em>Przygotował: Marcin Szczęsny<br>Karta informacyjna — kwiecień 2026</em></p>
