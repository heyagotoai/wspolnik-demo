# Karta produktu: 
## **System zarządzania wspólnotą mieszkaniową**

## 1. Przeznaczenie

Aplikacja webowa do obsługi małej wspólnoty mieszkaniowej: zastępuje rozproszone arkusze, papierowe głosowania i ręczne powiadomienia. Trzy warstwy: strona publiczna, panel mieszkańca, panel administratora. Typowo wdrażana na **dedykowanej domenie** wspólnoty.

**Skala docelowa:** rząd wielkości ~50 lokali/mieszkańców; administrator i rola zarządcy (ograniczony dostęp operacyjny).

---

## 2. Role użytkowników

| Rola | Kto | Uprawnienia |
|------|-----|-------------|
| Gość | Odwiedzający bez logowania | Strona publiczna, formularz kontaktowy |
| Mieszkaniec | Właściciel lokalu | Panel: finanse, głosowania, dokumenty itd. **Wyłącznie własne dane** |
| Zarządca | Osoba z ograniczonym mandatem | Podgląd finansów, ogłoszenia, terminy. **Bez** edycji stawek, **bez** zarządzania kontami |
| Administrator | Pełne prowadzenie systemu | CRUD mieszkańców, lokali, naliczeń, stawek, uchwał, dokumentów |

Konta mieszkańców **nie rejestrują się samodzielnie** — administrator tworzy konta (np. zaproszenie e‑mailem).

---

## 3. Zakres funkcjonalny

### 3.1 Strona publiczna (bez logowania)

- **Strona główna** — prezentacja wspólnoty, skróty do sekcji, ostatnie ogłoszenia
- **Aktualności** — lista ogłoszeń (przypinanie ważnych), terminy z odliczaniem dni
- **Dokumenty** — dokumenty publiczne do pobrania (kategorie)
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

- **Dashboard** — statystyki (mieszkańcy, lokale, ogłoszenia, dokumenty)
- **Mieszkańcy** — dodawanie (konto e‑mail/hasło), edycja, dezaktywacja, usuwanie; powiązanie z lokalem
- **Lokale** — CRUD: numer, m², udział %, liczba zameldowanych, właściciel, saldo początkowe + data; zbiorcza data salda
- **Import stanu początkowego (Excel)** — szablon .xlsx, podgląd (dry-run), dopasowanie numerów (także złożone przypadki)
- **Import wpłat (Excel)** — arkusz dopasowań; wiele dat/kwot; wpłaty zbiorcze z podziałem; **deduplikacja** po parze (lokal, data)
- **Grupy rozliczeniowe** — zgrupowanie lokali, wpłaty grupowe, saldo łączne u mieszkańca
- **Ogłoszenia** — CRUD, przypinanie, **wysyłka e‑mail** do aktywnych mieszkańców
- **Dokumenty** — upload PDF (limit rozmiaru wg konfiguracji), publiczny/prywatny
- **Terminy** — CRUD
- **Naliczenia miesięczne** — generowanie per lokal i miesiąc; wzory (m², osoby); regeneracja z zachowaniem pozycji ręcznych; pozycje „inne”; stawki z datą obowiązywania; podsumowania; ostrzeżenie przy kolizji z saldem początkowym
- **Uchwały i głosowania** — stany: szkic → głosowanie → zamknięte; **głosy z zebrania** w szkicu (spójny model z głosem online); akcje w panelu (m.in. głosy z zebrania, reset, PDF, edycja, usuwanie); powiadomienie przy otwarciu; wyniki (liczby i %); **eksport PDF** (także szkic z głosami)
- **Wiadomości** — wiadomości z formularza kontaktowego, oznaczanie przeczytanych
- **Dziennik operacji** — historia zmian finansowych i głosowań, filtry, szczegóły
- **Wydruk salda** — pismo z saldem, danymi konta, terminem lub informacją o nadpłacie
- **Powiadomienie e‑mail o saldzie** — wysyłka per mieszkaniec
- **Import zestawienia bankowego (.xls)** — dopasowanie po **nazwisku rozliczeniowym** i numerze lokalu z opisu; dry-run; deduplikacja jak przy imporcie Excel; raport niedopasowań. **MT940** — opcjonalnie, gdy bank udostępnia (osobna ścieżka; status zależy od potwierdzenia formatu)

### 3.4 Powiadomienia e‑mail

- Masowa wysyłka ogłoszeń
- Saldo (indywidualnie)
- Formularz kontaktowy → administrator
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
| Retencja | Usuwanie/archiwizacja danych finansowych powyżej uzgodnionego horyzontu (np. 5 lat) |
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
| Backup | Automatyczne kopie, udokumentowana procedura odtworzenia przy wdrożeniu |
| Jakość | Testy automatyczne w pipeline; testy izolacji danych; przed produkcją zalecany przegląd bezpieczeństwa |

---

<div style="break-before: page; page-break-before: always;"></div>

## 6. Stack technologiczny (przykład wdrożenia)

System może być zrealizowany m.in. w następującym zestawie (konkretny wariant zależy od projektu wdrożeniowego):

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router
- **Backend:** FastAPI (Python), hosting serverless
- **Dane:** Supabase — PostgreSQL z Row Level Security, uwierzytelnianie z białą listą e‑mail, magazyn plików
- **E‑mail:** funkcja brzegowa jako relay SMTP do skrzynki na domenie wspólnoty

<p style="margin-top: 1.25em; page-break-inside: avoid; break-inside: avoid;"><em>Przygotował: Marcin Szczęsny<br>Karta informacyjna — marzec 2026</em></p>
