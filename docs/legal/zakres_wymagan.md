# Zakres wymagań do wdrożenia — System WM GABI

> Dokument zbiorczy: lista dokumentów, działań i decyzji niezbędnych do zgodnego z prawem uruchomienia Systemu.

---

## A. Dokumenty gotowe do wdrożenia (przygotowane w ramach niniejszego opracowania)

| # | Dokument | Status | Uwagi |
|---|----------|--------|-------|
| 1 | **Polityka Prywatności (RODO)** | ✅ Przygotowany | Wymaga uzupełnienia danych kontaktowych. Zalecana weryfikacja przez prawnika. |
| 2 | **Regulamin Systemu WM GABI** | ✅ Przygotowany | Wymaga uzupełnienia adresu URL systemu i adresu e-mail. Zalecana weryfikacja przez prawnika. |
| 3 | **Uchwała nr 3/2026** | ✅ Przygotowany (poprawiony) | Rozszerzona o klauzulę dobrowolności, odniesienie do regulaminu i RODO. |

---

## B. Dokumenty i działania wymagające realizacji

### B1. Umowy powierzenia przetwarzania danych (DPA) — art. 28 RODO

| Dostawca | Rodzaj usługi | Działanie |
|----------|--------------|-----------|
| Supabase Inc. | Baza danych, uwierzytelnianie | Pobrać kopię DPA (Data Processing Addendum) ze strony Supabase i zarchiwizować w dokumentacji Wspólnoty. DPA zostało zaakceptowane przy zakładaniu konta. |
| Vercel Inc. | Hosting aplikacji | Pobrać kopię DPA ze strony Vercel i zarchiwizować w dokumentacji Wspólnoty. DPA zostało zaakceptowane przy zakładaniu konta. |

**Uwaga:** Obaj dostawcy mają gotowe DPA (Data Processing Addendum) wbudowane w swoje regulaminy — zostały one zaakceptowane przy zakładaniu konta. Wystarczy pobrać kopie tych dokumentów ze stron dostawców i zarchiwizować je w dokumentacji Wspólnoty, aby móc wykazać zgodność z art. 28 RODO. Warto zlecić prawnikowi krótką weryfikację, czy obejmują one wymagania art. 28 ust. 3 RODO (przedmiot, czas, charakter przetwarzania, obowiązki podmiotu przetwarzającego).

### B2. Rejestr Czynności Przetwarzania (RCP) — art. 30 RODO

Wspólnota mieszkaniowa, jako administrator regularnie przetwarzający dane finansowe i dane do głosowań, powinna prowadzić RCP. Poniżej szablon minimalny:

**Czynność 1: Zarządzanie kontami użytkowników**
- Cel: obsługa członkostwa we Wspólnocie, identyfikacja właścicieli
- Kategorie osób: właściciele lokali
- Kategorie danych: imię, nazwisko, e-mail, numer lokalu, udział
- Podstawa prawna: art. 6(1)(c) RODO
- Odbiorcy: Subabase Inc., Vercel Inc.
- Transfer do państw trzecich: dane w UE; dostawcy z USA objęci SCC
- Planowany termin usunięcia: po zbyciu lokalu

**Czynność 2: Prezentowanie informacji o rozliczeniach**
- Cel: zapewnienie transparentności rozliczeń
- Kategorie osób: właściciele lokali
- Kategorie danych: naliczenia, saldo, historia wpłat
- Podstawa prawna: art. 6(1)(c) i art. 6(1)(f) RODO
- Odbiorcy: Subabase Inc., Vercel Inc.
- Planowany termin usunięcia: po zbyciu lokalu (dane informacyjne w Systemie)

**Czynność 3: Głosowania nad uchwałami**
- Cel: przeprowadzanie głosowań zgodnie z ustawą o własności lokali
- Kategorie osób: właściciele lokali
- Kategorie danych: imię, nazwisko, numer lokalu, udział, treść głosu, data głosowania
- Podstawa prawna: art. 6(1)(c) RODO
- Odbiorcy: Subabase Inc., Vercel Inc.
- Planowany termin usunięcia: dane w Systemie — po wygenerowaniu protokołu; dokumentacja papierowa — wg przepisów prawa

**Czynność 4: Komunikacja (ogłoszenia, mailing)**
- Cel: informowanie właścicieli o sprawach Wspólnoty
- Kategorie osób: właściciele lokali
- Kategorie danych: imię, adres e-mail
- Podstawa prawna: art. 6(1)(f) RODO
- Odbiorcy: Subabase Inc., Vercel Inc.
- Planowany termin usunięcia: po zbyciu lokalu

**Czynność 5: Formularz kontaktowy**
- Cel: umożliwienie kontaktu z Zarządem Wspólnoty
- Kategorie osób: osoby korzystające z formularza
- Kategorie danych: imię, e-mail, treść wiadomości
- Podstawa prawna: art. 6(1)(f) RODO
- Odbiorcy: Zarząd Wspólnoty (e-mail)
- Planowany termin usunięcia: dane nie są zapisywane w Systemie (wariant „w locie")

### B3. Procedura naruszenia ochrony danych (zarys)

Zarząd Wspólnoty powinien dysponować spisaną procedurą na wypadek naruszenia. Elementy minimalne:

1. **Wykrycie i ocena** — kto stwierdza naruszenie (Administrator Systemu/Zarząd), wstępna ocena zakresu i ryzyka.
2. **Powiadomienie wewnętrzne** — niezwłoczne powiadomienie Zarządu Wspólnoty.
3. **Zgłoszenie do UODO** — jeśli naruszenie może powodować ryzyko dla praw osób fizycznych: zgłoszenie w ciągu 72 godzin od stwierdzenia naruszenia (art. 33 RODO). Nie każde naruszenie wymaga zgłoszenia — tylko te, w których istnieje ryzyko naruszenia praw (np. wyciek danych wielu osób, dane finansowe).
4. **Powiadomienie osób, których dane dotyczą** — jeśli naruszenie może powodować wysokie ryzyko: poinformowanie mieszkańców bez zbędnej zwłoki (art. 34 RODO).
5. **Dokumentacja** — wpis do rejestru naruszeń (obowiązkowy niezależnie od zgłoszenia do UODO).
6. **Działania naprawcze** — zmiana haseł, blokada dostępu, aktualizacja zabezpieczeń.

**Osoba odpowiedzialna:** Zarząd Wspólnoty jako organ administratora danych (Wspólnoty).

---

## C. Kwestie do rozstrzygnięcia z prawnikiem

Poniższe pytania z listy wymagają fachowej opinii prawnej. Dokumenty przygotowano z założeniem najbardziej prawdopodobnej interpretacji, ale ostateczne rozstrzygnięcie powinno należeć do prawnika:

### Priorytet wysoki (wpływ na treść dokumentów):

1. **Głosowanie elektroniczne jako forma dokumentowa** (pyt. 16-18) — dokumenty zakładają, że głos elektroniczny spełnia wymóg formy dokumentowej (art. 77² KC). Prawnik powinien potwierdzić, czy identyfikacja przez konto z hasłem i oświadczeniem jest wystarczająca.

2. **Mailing — zgoda vs. uzasadniony interes** (pyt. 26-27) — dokumenty opierają mailing na art. 6(1)(f) RODO (prawnie uzasadniony interes). Kwestia relacji z art. 10 ustawy o świadczeniu usług drogą elektroniczną wymaga rozstrzygnięcia. Jeśli prawnik uzna, że potrzebna jest odrębna zgoda na komunikację e-mail, należy dodać odpowiedni checkbox przy aktywacji konta.

3. **Okres przejściowy przy zmianie właściciela** (pyt. 14) — regulamin zakłada max. 30 dni. Prawnik powinien potwierdzić dopuszczalność.

### Priorytet średni (nie blokują wdrożenia):

4. **IOD** (pyt. 32-33) — mała wspólnota prawdopodobnie nie musi powoływać IOD, ale warto potwierdzić.

5. **DPIA** (pyt. 44) — prawdopodobnie nie jest wymagana (brak danych wrażliwych, brak profilowania), ale warto potwierdzić.

6. **RCP — obowiązkowość** (pyt. 30) — dokumenty zakładają, że jest obowiązkowy. Prawnik może potwierdzić, czy wyjątek z art. 30 ust. 5 ma zastosowanie (raczej nie, ze względu na regularne przetwarzanie danych finansowych).

---

## D. Checklist wdrożeniowy

### Przed uruchomieniem Systemu:

- [ ] Weryfikacja Polityki Prywatności przez prawnika
- [ ] Weryfikacja Regulaminu przez prawnika
- [ ] Podjęcie Uchwały nr 3/2026 (głosowanie właścicieli)
- [ ] Uzupełnienie danych kontaktowych w dokumentach (e-mail, URL systemu)
- [ ] Pobranie i archiwizacja kopii DPA z Supabase Inc. (Data Processing Addendum ze strony dostawcy)
- [ ] Pobranie i archiwizacja kopii DPA z Vercel Inc. (Data Processing Addendum ze strony dostawcy)
- [ ] Sporządzenie Rejestru Czynności Przetwarzania
- [ ] Spisanie procedury na wypadek naruszenia ochrony danych
- [ ] Implementacja klauzuli informacyjnej przy formularzu kontaktowym
- [ ] Implementacja checkboxów z oświadczeniami przy pierwszym logowaniu
- [ ] Udostępnienie Regulaminu i Polityki Prywatności w Systemie (do wglądu przed i po aktywacji konta)

### Po uruchomieniu (bieżąco):

- [ ] Aktualizacja RCP przy zmianach w przetwarzaniu
- [ ] Prowadzenie rejestru naruszeń (nawet jeśli pusty)
- [ ] Przegląd aktualności DPA przy zmianach dostawców lub aktualizacjach ich regulaminów
- [ ] Aktualizacja Polityki Prywatności przy zmianach prawnych lub technicznych
