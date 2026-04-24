# Instrukcja obsługi panelu administratora — WM GABI

> Dokument dla zarządcy wspólnoty. Opisuje codzienną obsługę systemu bez wiedzy technicznej.

---

## Logowanie

1. Wejdź na **wmgabi.pl**
2. Kliknij **Zaloguj się** w prawym górnym rogu
3. Wpisz adres email i hasło administratora
4. Po zalogowaniu w nagłówku pojawi się przycisk **Panel admina**

> Jeśli logujesz się po raz pierwszy, zmień hasło w ustawieniach konta.

---

## Przegląd panelu

Po wejściu do panelu widzisz **Dashboard** z podsumowaniem:
- liczba mieszkańców, lokali, ogłoszeń, dokumentów
- najbliższe ważne terminy
- ostatnie 5 ogłoszeń

Z lewej strony znajduje się **pasek nawigacji** z sekcjami (kolejność jak w systemie):
Pulpit · Lokale · Naliczenia · **Grupy rozliczeniowe** (tylko administrator) · Mieszkańcy · Uchwały · Dokumenty · Terminy · Ogłoszenia · Wiadomości · Dziennik operacji

---

## Mieszkańcy

**Dodawanie nowego mieszkańca:**
1. Kliknij **Dodaj mieszkańca**
2. Wpisz imię i nazwisko, adres email, numer lokalu
3. Ustaw rolę: `mieszkaniec` (domyślnie), `zarządca` lub `admin`
4. Kliknij **Zapisz** — system automatycznie tworzy konto i wysyła link aktywacyjny na podany email

**Edycja / dezaktywacja:**
- Kliknij ikonę ołówka przy mieszkańcu, aby edytować dane
- Przełącz status **Aktywny/Nieaktywny**, aby zablokować dostęp bez usuwania konta

**Usuwanie:**
- Użyj ikony kosza — uwaga, operacja jest nieodwracalna

> Mieszkaniec może zalogować się dopiero po aktywacji konta przez link z emaila.

**Rola zarządcy vs administrator:**

| Funkcja | Administrator | Zarządca |
|---------|:---:|:---:|
| Podgląd mieszkańców, lokali, finansów | ✅ | ✅ (read-only) |
| Ogłoszenia i terminy (CRUD) | ✅ | ✅ |
| Dokumenty, uchwały, wiadomości | ✅ pełny dostęp | ✅ podgląd |
| Dziennik operacji | ✅ | ✅ |
| Zarządzanie kontami (dodaj/edytuj/usuń) | ✅ | ❌ |
| Stawki i generowanie naliczeń | ✅ | ❌ |
| Wysyłka powiadomień email | ✅ | ❌ |
| Grupy rozliczeniowe (wspólne rozliczenie wielu lokali) | ✅ | ❌ |

---

## Lokale

Na górze strony **Lokale** (widoczne także dla **zarządcy**) jest zwijany panel **Ostatnie importy wpłat** (domyślnie zwinięty; klik w nagłówek rozwija): zestawienie `.xls` z banku, import z arkusza Excel, **najpóźniejszą zaksięgowaną datę wpłaty** oraz **lokal (lub wpłata zbiorcza)** i **kwotę** — ułatwia planowanie kolejnego eksportu z banku bez dublowania okresu.

**Dodawanie lokalu:**
1. Kliknij **Dodaj lokal**
2. Wypełnij: numer lokalu, powierzchnia (m²), udział w nieruchomości wspólnej (%), liczba domowników
3. Opcjonalnie: wpisz **saldo początkowe** (jeśli lokal miał zaległości lub nadpłatę przed uruchomieniem systemu)
4. Kliknij **Zapisz**

**Saldo lokalu:**
- System wyświetla aktualne saldo: `saldo_początkowe + wpłaty − naliczenia`
- Ujemne saldo = niedopłata (dług), dodatnie = nadpłata

**Drukowanie salda:**
- Kliknij **Drukuj saldo** przy danym lokalu — otwiera się podgląd wydruku (jedna strona): pismo z saldem, przy zadłużeniu termin spłaty (+14 dni od wystawienia), przy nadpłacie tekst o odliczeniu, numer konta wspólnoty

**Powiadomienie emailem:**
- Kliknij **Wyślij email** przy lokalu — na skrzynkę właściciela trafia **ta sama treść** co przy **Drukuj saldo** (pismo SALDO w wersji tekstowej)

**Import stanu z pliku Excel (hurtowe ustawienie salda):**
- Z listy lokali: pobierz **szablon .xlsx** (wiersz `data_salda`, nagłówki `numer_lokalu` / `saldo_poczatkowe`), wypełnij, **podgląd (dry-run)**, potem zastosuj
- **Wiele lokali w jednym wierszu** (to samo saldo): rozdziel numery przecinkiem lub średnikiem; możesz też użyć zapisu z kropką, który Excel traktuje jak liczbę (np. dwa lokale obok siebie) — opis w oknie importu
- **Jeden lokal o numerze z przecinkiem** (np. `3,4A` albo `25,26` — jedna pozycja na liście lokali): numer w pliku musi **dokładnie** odpowiadać polu „numer” w bazie; system dopasowuje najpierw cały tekst komórki, dopiero gdy go nie ma — traktuje wpis jako listę osobnych lokali
- To **nie** jest import wyciągu bankowego — tylko pomoc przy wdrożeniu lub korekcie sald początkowych

**Import wpłat z pliku Excel (zestawienie dopasowań):**
- Z listy lokali: **Importuj wpłaty** — szablon lub własny arkusz **Dopasowania** z kolumnami **Lokal**, **Data wpłaty**, **Kwota** (inne kolumny, np. nazwisko, są ignorowane)
- **Kilka dni księgowania** w jednym wierszu: daty oddziel średnikiem (`10.02.2026; 27.02.2026`). Jedna kwota w komórce = osobna wpłata o tej kwocie na każdą datę; **różne kwoty** — ten sam układ po średniku w Kwota (`341,20; 450,00`)
- **Wiele lokali** w jednym wierszu z **wieloma datami** w tym samym wierszu nie jest obsługiwane — użyj osobnych wierszy lub jednej daty
- **Duplikaty:** jeśli w systemie jest już wpłata dla tego lokalu i tej samej **daty** (albo ta para pojawiła się wcześniej w tym samym pliku), wiersz trafia do **Pominiętych** z komunikatem — ponowne zastosowanie tego samego arkusza **nie** podwaja wpłat. Przy wpłacie **zbiorczej** na kilka lokali cały wiersz jest pomijany, gdy **którykolwiek** z tych lokali ma już wpłatę w tym dniu.
- To **nie** jest automatyczny import MT940 — osobna ścieżka niż import `.xls` z banku

**Import zestawienia bankowego (.xls):**
- Z listy lokali: **Import z banku (.xls)** — plik w starym formacie Excel (`.xls`), zwykle „zestawienie” pobrane z banku (nie myl z arkuszem `.xlsx` „Dopasowania”).
- Przed pierwszym importem uzupełnij przy każdym lokalu **nazwisko rozliczeniowe** (pole w edycji lokalu) — system dopasowuje przelewy po tym nazwisku i po numerze lokalu z treści przelewu.
- Najpierw **podgląd** (symulacja), potem **zastosuj**. **Duplikaty** działają tak samo jak przy imporcie wpłat z Excela (lokal + data).

---

## Grupy rozliczeniowe (tylko administrator)

Gdy jeden właściciel ma kilka lokali i płaci jedną wpłatą na wszystkie:
1. Utwórz **grupę rozliczeniową** i nadaj nazwę (np. nazwisko właściciela)
2. Przypisz do grupy wybrane lokale na liście w tej sekcji (lub z edycji lokalu — pole grupy)
3. Rejestruj **wpłatę grupową** — system rozdzieli ją proporcjonalnie do naliczeń na poszczególne lokale
4. Mieszkaniec w panelu **Finanse** widzi saldo łączne oraz rozbicie per lokal

---

## Ogłoszenia

**Dodawanie ogłoszenia:**
1. Kliknij **Dodaj ogłoszenie**
2. Wpisz tytuł, treść i krótki opis (excerpt — pokazywany na liście)
3. Zaznacz **Przypięte**, jeśli ogłoszenie ma wyświetlać się na górze
4. Kliknij **Zapisz**

**Wysyłka emailem do wszystkich mieszkańców:**
- Po zapisaniu ogłoszenia kliknij **Wyślij emailem**
- System wysyła wiadomość do wszystkich aktywnych mieszkańców
- Przycisk zmienia się na ✓ Wysłano (nie można wysłać ponownie)

> Ogłoszenia są widoczne w panelu mieszkańca i na stronie publicznej wmgabi.pl.

---

## Dokumenty

**Dodawanie dokumentu:**
1. Kliknij **Dodaj dokument**
2. Wybierz plik PDF (max 10 MB)
3. Wpisz nazwę i wybierz kategorię: regulaminy, protokoły, formularze, uchwały, sprawozdania, inne
4. Ustaw widoczność: **Publiczny** (widoczny bez logowania) lub **Prywatny** (tylko zalogowani mieszkańcy)
5. Kliknij **Zapisz**

**Pobieranie / usuwanie:**
- Kliknij **Pobierz**, aby pobrać plik
- Kliknij ikonę kosza, aby usunąć — pliki usuwane są też z serwera

---

## Terminy

**Dodawanie terminu:**
1. Kliknij **Dodaj termin**
2. Wpisz tytuł, datę i opcjonalny opis
3. Kliknij **Zapisz**

Terminy są wyświetlane mieszkańcom w ich panelu w sekcji **Terminy**. Przeszłe terminy są wyszarzone.

> Terminy głosowania nad uchwałami dodawane są automatycznie przy tworzeniu uchwały — nie trzeba ich dodawać ręcznie.

---

## Naliczenia

Sekcja ma dwie zakładki: **Naliczenia** i **Stawki**.

### Stawki

Przed pierwszym generowaniem naleceń ustaw stawki:
1. Przejdź do zakładki **Stawki**
2. Kliknij **Dodaj stawkę** dla każdego rodzaju opłaty:
   - `media` — czynsz/media
   - `fundusz remontowy`
   - `śmieci`
   - `inne`
3. Wpisz kwotę na m² lub kwotę ryczałtową
4. Zapisz

Stawki są wersjonowane — zmiana stawki nie nadpisuje historycznych naliczeń.

### Generowanie naleceń

1. Przejdź do zakładki **Naliczenia**
2. Wybierz rok i miesiąc
3. Kliknij **Generuj naliczenia** — system wyliczy kwoty dla wszystkich lokali na podstawie stawek i powierzchni
4. Sprawdź podsumowanie i ewentualne ostrzeżenia
5. Potwierdź generowanie

**Ręczna pozycja (inne):**
- Kliknij **Dodaj pozycję** przy konkretnym lokalu, aby doliczyć indywidualną opłatę z opisem

**Usuwanie:**
- Naliczenia można usunąć przed zatwierdzeniem okresu

---

## Uchwały i głosowania

**Cykl życia uchwały:** `Szkic → Głosowanie → Zamknięta`

**Tworzenie uchwały:**
1. Kliknij **Dodaj uchwałę**
2. Wpisz tytuł, treść, opcjonalnie datę końca głosowania
3. Status domyślnie: `Szkic` — uchwała niewidoczna dla mieszkańców
4. Kliknij **Zapisz**

**Głosy z zebrania (osobiście przed głosowaniem online):**
- Jeśli część mieszkańców oddała głos na zebraniu wspólnoty, zanim włączysz głosowanie w systemie: przy uchwale w statusie **Szkic** kliknij **Głosy z zebrania**
- Wybierz mieszkańca i opcję (Za / Przeciw / Wstrzymuje się). W systemie obowiązuje **jeden głos na mieszkańca** przy danej uchwale — osoba wpisana tutaj **nie zagłosuje ponownie** w panelu po uruchomieniu głosowania
- Możesz **usunąć** pojedynczy wpis przed publikacją (korekta). **Resetuj głosy** usuwa wszystkie głosy naraz (także po starcie głosowania — z podwójnym potwierdzeniem)
- **Uwaga:** cofnięcie uchwały do szkicu z etapu głosowania **usuwa wszystkie głosy** (także z zebrania) — patrz komunikat przy zapisie uchwały

**Uruchomienie głosowania:**
- Zmień status na **Głosowanie** — mieszkańcy zobaczyją uchwałę i będą mogli głosować

**Kto może głosować:** mieszkaniec (aktywne konto). Administrator lub zarządca — tylko jeśli w Lokale jest przypisany jako właściciel lokalu (inaczej brak przycisków głosowania).

**Podgląd wyników:**
- Kliknij na uchwałę, aby zobaczyć bieżące wyniki: Za / Przeciw / Wstrzymuję się (procenty wg udziałów wspólnoty lub — gdy u głosujących brak przypisanych udziałów — wg liczby głosów)
- Lista głosów z imionami i datami

**Zamknięcie głosowania:**
- Zmień status na **Zamknięta** — głosowanie niedostępne, wyniki zachowane

**Reset głosów:**
- Jeśli głosowanie wymaga powtórzenia, kliknij **Resetuj głosy**
- Wymagane jest wpisanie potwierdzenia tekstowego — operacja jest nieodwracalna

**Eksport do PDF:**
- Kliknij ikonę pobrania (**Eksportuj wyniki głosowania (PDF)**) w prawym górnym rogu karty uchwały — ta sama grupa co reset głosów, edycja i usunięcie (obok przycisku «Głosy z zebrania», gdy jest widoczny)
- Otwiera się podgląd wydruku do zapisu/druku jako PDF

---

## Dziennik operacji

Dziennik rejestruje wszystkie ważne operacje w systemie: zmiany naliczeń, wpłat, stawek, lokali, głosów i uchwał. Dostępny tylko dla administratora.

**Przeglądanie:**
- W lewym menu kliknij **Dziennik operacji**
- Tabela pokazuje: datę i godzinę, kto wykonał operację, typ akcji, obszar systemu i opis zmiany
- Kliknij strzałkę (▾) przy wpisie, aby zobaczyć szczegóły — poprzednie i nowe dane

**Filtrowanie:**
- **Tabela** — np. Naliczenia, Wpłaty, Lokale, Głosy
- **Akcja** — Utworzenie, Zmiana, Usunięcie, Generowanie, Reset głosów, Konfiguracja
- **Od daty / Do daty** — zakres czasowy

Wyniki paginowane po 50 wpisów.

> Dziennik jest tylko do odczytu — nie można edytować ani usuwać wpisów.

---

## Wiadomości

Wiadomości przychodzą z formularza kontaktowego na stronie wmgabi.pl.

- Nieprzeczytane wiadomości oznaczone są **pogrubioną czcionką**
- Kliknij wiadomość, aby ją rozwinąć — automatycznie zostaje oznaczona jako przeczytana
- Kliknij ikonę kosza, aby usunąć wiadomość
- Liczba nieprzeczytanych wiadomości widoczna jest jako badge przy pozycji **Wiadomości** w menu

> Formularz kontaktowy ma limit: 5 wiadomości na godzinę z jednego adresu email.

---

## Kopie zapasowe

System automatycznie tworzy kopię zapasową danych **co niedzielę o 02:00 UTC** (04:00 polskiego czasu). Nie wymaga żadnej akcji ze strony administratora.

**Co jest zapisywane:**
- Wszystkie dane z bazy (lokale, mieszkańcy, naliczenia, wpłaty, stawki, uchwały, głosy, ustawienia)
- Lista plików z dokumentów

**Przechowywanie:**
- Ostatnie 12 kopii (ok. 3 miesiące)
- Starsze kopie są automatycznie usuwane

**Powiadomienia:**
- Po wykonaniu kopii system wysyła email potwierdzający do administratora
- W razie błędu wysyłany jest email z informacją o problemie

> Kopie przechowywane są w Supabase Storage (bucket `backups`). Dostęp do plików możliwy przez panel Supabase — w razie potrzeby odtworzenia danych skontaktuj się z administratorem systemu.

---

## Typowe zadania — ściągawka

| Zadanie | Gdzie |
|---|---|
| Nowy mieszkaniec | Mieszkańcy → Dodaj |
| Blokada dostępu | Mieszkańcy → edytuj → Nieaktywny |
| Nowe ogłoszenie | Ogłoszenia → Dodaj |
| Wysyłka ogłoszenia emailem | Ogłoszenia → Wyślij emailem |
| Nowy dokument | Dokumenty → Dodaj |
| Naliczenia na miesiąc | Naliczenia → Generuj |
| Głosowanie nad uchwałą | Uchwały → zmień status na Głosowanie |
| Sprawdź saldo lokalu | Lokale → wiersz lokalu |
| Odpowiedź na wiadomość | Wiadomości → odczyt emaila nadawcy, odpowiedz ręcznie |
| Sprawdź historię zmian | Dziennik operacji → filtry |
| Kopia zapasowa | Automatyczna (co niedzielę) — brak akcji wymagany |

---

## Często zadawane pytania

**Mieszkaniec nie może się zalogować.**
→ Sprawdź czy konto jest **Aktywne** (Mieszkańcy). Sprawdź czy aktywował konto przez link z emaila.

**Ogłoszenie nie trafiło na emaile.**
→ Sprawdź przycisk "Wyślij emailem" — jeśli już wysłano, przycisk pokazuje ✓. W razie problemu skontaktuj się z administratorem systemu.

**Chcę usunąć mieszkańca, ale jest przypisany do lokalu.**
→ Najpierw odepnij lokal (edytuj mieszkańca, usuń przypisanie do lokalu), potem usuń konto.

**Naliczyłem za dużo — co robić?**
→ Usuń naliczenie z danego miesiąca i wygeneruj ponownie lub dodaj ręczną korektę z ujemną kwotą.

---

*Dokument zaktualizowany: 2026-03-28. W razie pytań: administrator systemu.*
