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

Z lewej strony znajduje się **pasek nawigacji** z sekcjami:
Mieszkańcy · Lokale · Ogłoszenia · Dokumenty · Terminy · Naliczenia · Uchwały · Wiadomości

---

## Mieszkańcy

**Dodawanie nowego mieszkańca:**
1. Kliknij **Dodaj mieszkańca**
2. Wpisz imię i nazwisko, adres email, numer lokalu
3. Ustaw rolę: `mieszkaniec` (domyślnie) lub `admin`
4. Kliknij **Zapisz** — system automatycznie tworzy konto i wysyła link aktywacyjny na podany email

**Edycja / dezaktywacja:**
- Kliknij ikonę ołówka przy mieszkańcu, aby edytować dane
- Przełącz status **Aktywny/Nieaktywny**, aby zablokować dostęp bez usuwania konta

**Usuwanie:**
- Użyj ikony kosza — uwaga, operacja jest nieodwracalna

> Mieszkaniec może zalogować się dopiero po aktywacji konta przez link z emaila.

---

## Lokale

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

**Uruchomienie głosowania:**
- Zmień status na **Głosowanie** — mieszkańcy zobaczyją uchwałę i będą mogli głosować

**Podgląd wyników:**
- Kliknij na uchwałę, aby zobaczyć bieżące wyniki: Za / Przeciw / Wstrzymuję się
- Lista głosów z imionami i datami

**Zamknięcie głosowania:**
- Zmień status na **Zamknięta** — głosowanie niedostępne, wyniki zachowane

**Reset głosów:**
- Jeśli głosowanie wymaga powtórzenia, kliknij **Resetuj głosy**
- Wymagane jest wpisanie potwierdzenia tekstowego — operacja jest nieodwracalna

**Eksport do PDF:**
- Kliknij **Eksportuj PDF**, aby pobrać protokół głosowania z wynikami

---

## Wiadomości

Wiadomości przychodzą z formularza kontaktowego na stronie wmgabi.pl.

- Nieprzeczytane wiadomości oznaczone są **pogrubioną czcionką**
- Kliknij wiadomość, aby ją rozwinąć — automatycznie zostaje oznaczona jako przeczytana
- Kliknij ikonę kosza, aby usunąć wiadomość
- Liczba nieprzeczytanych wiadomości widoczna jest jako badge przy pozycji **Wiadomości** w menu

> Formularz kontaktowy ma limit: 5 wiadomości na godzinę z jednego adresu email.

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

*Dokument wygenerowany: 2026-03-24. W razie pytań: administrator systemu.*
