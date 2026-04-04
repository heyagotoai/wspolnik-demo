# Karta Produktu — Zapytanie ofertowe
## System zarządzania wspólnotą mieszkaniową

> **Utrzymanie:** Opis zakresu funkcjonalnego jest utrzymywany **spójnie** z `docs/KARTA_PRODUKTU.md` (karta informacyjna bez kontekstu oferty). Zmiany w produkcie wprowadzaj **równolegle w obu plikach**. Reguła dla agentów/IDE: `CLAUDE.md` i `.cursorrules` (sekcja dokumentacji / polecenie „zaktualizuj”).

---

## 1. Cel projektu

Potrzebuję webowej aplikacji do zarządzania małą wspólnotą mieszkaniową. System ma zastąpić arkusze Excel, papierowe głosowania i ręczne powiadomienia. Trzy warstwy dostępu: strona publiczna, panel mieszkańca, panel administratora. Aplikacja na własnej domenie wspólnoty.

**Skala:** wspólnota ~50 lokali/mieszkańców, administrator + zarządca.

---

## 2. Role użytkowników

| Rola | Kto | Uprawnienia |
|------|-----|-------------|
| Gość | Każdy bez logowania | Przeglądanie strony publicznej, formularz kontaktowy |
| Mieszkaniec | Właściciel lokalu | Panel z finansami, głosowaniami, dokumentami. Widzi TYLKO swoje dane |
| Zarządca | Osoba zarządzająca (ograniczone prawa) | Podgląd finansów, ogłoszenia, terminy. Bez edycji stawek, bez zarządzania kontami |
| Administrator | Pełne zarządzanie | Wszystko: CRUD mieszkańców, lokali, naliczeń, stawek, uchwał, dokumentów |

Brak publicznej rejestracji — administrator zakłada konta mieszkańcom (zaproszenie emailem).

---

## 3. Wymagane funkcjonalności

### 3.1 Strona publiczna (bez logowania)

- **Strona główna** — prezentacja wspólnoty (m.in. logowanie, aktualności, kontakt), sekcja aktualności z ogłoszeniami **jawnymi** (widoczne bez logowania); linki `http(s)://` w treści klikalne
- **Aktualności** — pełniejsza lista tych samych jawnych ogłoszeń; przypięcie ważnych na górze
- **Dokumenty** — publiczne dokumenty do pobrania z filtrowaniem po kategorii; pozycja „Dokumenty” w menu/stopce **po zalogowaniu**
- **Kontakt** — formularz kontaktowy (imię, email, nr mieszkania, temat, treść), dane kontaktowe wspólnoty, numery alarmowe
- **Stopka** — linki do dokumentów prawnych

### 3.2 Panel mieszkańca (wymaga zalogowania)

- **Dashboard** — aktualne saldo (nadpłata/zaległość), ostatnie ogłoszenia, nadchodzące terminy, aktywne głosowania
- **Finanse**
  - Saldo bieżące = saldo początkowe + suma wpłat − suma naliczeń (przy grupie rozliczeniowej: saldo łączne + rozbicie per lokal)
  - Lista naliczeń miesięcznych z wyborem miesiąca
  - Historia wpłat
  - Wizualne rozróżnienie: nadpłata (zielone), zaległość (czerwone), rozliczone
- **Ogłoszenia** — pełna lista z rozwijaniem długich treści, oznaczanie nowych (badge "Nowe")
- **Dokumenty** — pobieranie dokumentów prywatnych i publicznych
- **Terminy** — nadchodzące daty z odliczaniem + terminy aktywnych głosowań
- **Głosowania** — lista uchwał (aktywne/zamknięte), oddawanie głosów (za/przeciw/wstrzymuję się), pasek wyników w czasie rzeczywistym
- **Profil** — edycja danych osobowych, zmiana hasła; zgodnie z RODO: potwierdzenie akceptacji polityki prywatności i regulaminu przy wejściu do portalu (lub po aktualizacji dokumentów); przejrzysty podgląd zaakceptowanych wersji i kanał kontaktu w sprawie danych

### 3.3 Panel administratora

- **Dashboard** — statystyki: liczba mieszkańców, lokali, ogłoszeń, dokumentów
- **Zarządzanie mieszkańcami** — dodawanie (tworzy konto z emailem i hasłem), edycja danych, dezaktywacja, usuwanie. Automatyczne powiązanie z lokalem
- **Zarządzanie lokalami** — CRUD: numer lokalu, powierzchnia m², udział procentowy, liczba zameldowanych osób, przypisanie właściciela, saldo początkowe + data obowiązywania salda. Możliwość hurtowego ustawiania daty salda
- **Import stanu początkowego (Excel)** — szablon .xlsx, podgląd (dry-run), ustawienie salda i daty dla istniejących lokali; dopasowanie pełnego numeru (np. lokale zbiorcze) lub wiele lokali w jednej komórce
- **Import wpłat z Excela** — arkusz Dopasowania: kolumny Lokal, Data wpłaty, Kwota (inne ignorowane); wiele dat/kwot po średniku; wpłata zbiorcza = parent + automatyczne rozbicie per lokal; **deduplikacja** po parze (lokal, data) względem bazy i w obrębie tego samego pliku (ponowny import nie dubluje wpłat)
- **Grupy rozliczeniowe** — łączenie lokali w grupę, wpłaty grupowe z podziałem, saldo łączne u mieszkańca
- **Ogłoszenia** — CRUD + przypinanie + **przełącznik jawności** na stronie www (domyślnie treść tylko w panelu mieszkańca) + wysyłka emailem do wszystkich aktywnych mieszkańców
- **Dokumenty** — upload plików PDF (max 10MB), przełącznik publiczny/prywatny
- **Terminy** — CRUD ważnych dat z opisami
- **Naliczenia miesięczne**
  - Automatyczne generowanie naliczeń per lokal na wybrany miesiąc
  - Wzory naliczania: eksploatacja i fundusz remontowy = m² × stawka; śmieci = liczba osób × stawka
  - Możliwość regeneracji (aktualizacja po zmianie stawek) z zachowaniem pozycji ręcznych
  - Pozycje ręczne typu "inne" (np. indywidualna dopłata)
  - Zarządzanie stawkami z wersjonowaniem (data obowiązywania "od")
  - Podsumowania per typ naliczenia + suma zbiorcza
  - Ostrzeżenie przy generowaniu za miesiąc objęty saldem początkowym (ochrona przed podwójnym naliczeniem)
- **Uchwały i głosowania**
  - Workflow statusów: szkic → głosowanie → zamknięte
  - Rejestracja **głosów z zebrania** (osobiście) w szkicu przed publikacją — ten sam zapis co głos online, brak podwójnego głosu w panelu
  - Panel admina: logiczny układ akcji — przycisk «Głosy z zebrania», potem ikony (reset głosów, eksport PDF, edycja, usunięcie)
  - Automatyczne ogłoszenie do mieszkańców przy otwarciu głosowania
  - Podgląd wyników: za / przeciw / wstrzymał się (liczba i procent)
  - Eksport wyniku głosowania do PDF (podsumowanie + lista głosów per mieszkaniec), także dla szkicu z już wprowadzonymi głosami
- **Wiadomości** — podgląd wiadomości z formularza kontaktowego, oznaczanie jako przeczytane
- **Dziennik operacji** — historia wszystkich operacji finansowych i głosowań (kto, co, kiedy), filtrowanie po obszarze systemu i zakresie dat, podgląd szczegółów zmian
- **Wydruk salda** — formalne pismo z aktualnym saldem lokalu, danymi konta i (wg salda) terminem spłaty lub informacją o nadpłacie; jedna strona
- **Powiadomienie email o saldzie** — wysyłka informacji o saldzie na email mieszkańca jednym kliknięciem
- **Import zestawienia bankowego (.xls)** — plik zestawienia z banku (stary Excel); automatyczne dopasowanie przelewów do lokali po **nazwisku rozliczeniowym** (`billing_surname`) i numerze lokalu z opisu/adresu; podgląd (dry-run) i zapis; **deduplikacja** po parze (lokal, data) jak przy imporcie z Excela; niedopasowane pozycje w raporcie. Format **MT940** — opcjonalnie, gdy bank go dostarczy (osobna ścieżka)

### 3.4 Powiadomienia email

- Wysyłka ogłoszeń emailem do wszystkich mieszkańców
- Powiadomienie o saldzie (indywidualnie per mieszkaniec)
- Powiadomienie z formularza kontaktowego do admina
- Konfiguracja SMTP na domenie wspólnoty (np. powiadomienia@wspolnota.pl)

---

## 4. Wymagania bezpieczeństwa

| Wymaganie | Szczegóły |
|-----------|-----------|
| Autentykacja | Email + hasło. Brak publicznej rejestracji — tylko admin tworzy konta |
| Autoryzacja | Podział na role (admin, zarządca, mieszkaniec). Każdy endpoint zabezpieczony |
| Izolacja danych | Mieszkaniec widzi TYLKO swoje dane: swój lokal, swoje naliczenia, swoje wpłaty, swoje głosy. Nie może zobaczyć danych innego mieszkańca |
| RODO/GDPR | Minimalizacja danych osobowych, prawo do usunięcia konta i danych, pseudonimizacja w logach |
| Audit log | Logowanie operacji finansowych (kto, co, kiedy) — wymóg prawny |
| Retencja danych | Automatyczne usuwanie danych finansowych starszych niż 5 lat |
| Ochrona formularzy | Rate limiting na formularzu kontaktowym, ochrona przed XSS i injection |
| Testy bezpieczeństwa | Testy jednostkowe + testy izolacji danych + pentest przed wdrożeniem |

---

## 5. Wymagania niefunkcjonalne

| Obszar | Wymaganie |
|--------|-----------|
| Responsywność | Pełna obsługa mobile (mieszkańcy będą korzystać głównie z telefonów) |
| Wydajność | Czas ładowania strony < 2s. System obsługuje ~30 użytkowników jednocześnie |
| Dostępność | Hosting z SLA 99.9%+, automatyczne SSL |
| Koszty utrzymania | Minimalne — darmowe/tanie plany hostingu (Vercel free, Supabase free wystarczą dla tej skali) |
| Domena | System na własnej domenie wspólnoty (np. wspolnota.pl) |
| Backup | Automatyczne backupy bazy danych, procedura przywracania |
| CI/CD | Automatyczne testy przy każdym pushu, blokowanie deploy przy błędach |
| Testy E2E | Automatyczne testy kluczowych ścieżek (logowanie, głosowanie, finanse) |

---

## 6. Deliverables (co oczekuję na wyjściu)

1. **Działająca aplikacja** wdrożona na hostingu z własną domeną
2. **Kod źródłowy** w repozytorium Git z pełną historią commitów
3. **Baza danych** z migracjami SQL (powtarzalny setup od zera)
4. **Testy**
   - Testy jednostkowe backend (API, bezpieczeństwo, logika biznesowa)
   - Testy jednostkowe frontend (komponenty, integracja)
   - Testy izolacji danych (czy mieszkaniec A nie widzi danych B)
   - Testy E2E kluczowych ścieżek
5. **Dokumentacja**
   - Instrukcja wdrożeniowa (deploy od zera)
   - Instrukcja utrzymania (monitoring, migracje, debugowanie)
   - Instrukcja dla administratora (nietechniczny użytkownik)
   - Procedury awaryjne
6. **Konfiguracja email** — działająca wysyłka z domeny wspólnoty

---

## 7. Kontekst do wyceny

Proszę o wycenę w wariantach:

### Wariant A — MVP (minimum viable product)
Strona publiczna + panel mieszkańca (finanse, dokumenty, profil) + panel admina (mieszkańcy, lokale, ogłoszenia, dokumenty, naliczenia). Bez głosowań, bez importu bankowego, bez roli zarządcy.

### Wariant B — Pełny produkt
Wszystko z sekcji 3 (strona publiczna, panel mieszkańca, panel admina z głosowaniami, naliczeniami, eksportem PDF, powiadomieniami email, wydrukiem salda).

**W każdym wariancie proszę o podanie:**
- Szacunek godzin pracy
- Stawka godzinowa lub cena ryczałtowa
- Czas realizacji (tygodnie)
- Stack technologiczny, który zaproponujecie (lub potwierdzenie pracy w podanym stacku)
- Ile osób w zespole

---

## 8. Preferowany stack (opcjonalny)

Nie narzucam technologii, ale jeśli potrzebujecie wskazówki — poniższy stack sprawdził się w prototypie:

```
Frontend:  React + TypeScript + Tailwind CSS
Backend:   Python (FastAPI) lub Node.js
Baza:      PostgreSQL z Row Level Security (np. Supabase)
Auth:      Supabase Auth lub Auth0 lub własne JWT
Storage:   Supabase Storage lub S3-compatible
Hosting:   Vercel / Netlify / Railway
Email:     SMTP relay lub Resend / SendGrid
```

Jestem otwarty na inne propozycje, jeśli uzasadnione.

---

## 9. Harmonogram (pożądany)

| Etap | Zakres | Termin |
|------|--------|--------|
| Kick-off + MVP | Architektura, setup, strona publiczna, auth, panel admina (mieszkańcy, lokale, ogłoszenia) | Tydzień 1-2 |
| Finanse + naliczenia | Stawki, generowanie naliczeń, saldo, wydruk, import bankowy | Tydzień 2-3 |
| Głosowania + email | Uchwały, głosy, eksport PDF, powiadomienia email | Tydzień 3-4 |
| Hardening + wdrożenie | Testy, security audit, CI/CD, dokumentacja, deploy, szkolenie | Tydzień 5-6 |

Łączny czas: **4-6 tygodni**.

---

*Zapytanie ofertowe — marzec 2026*
*Kontakt: [do uzupełnienia]*
