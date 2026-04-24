# Analiza dokumentów WM GABI — audyt kompletności

> Data analizy: 2026-03-31
> Podstawy prawne: RODO (Rozporządzenie UE 2016/679), Ustawa o własności lokali z 24.06.1994 r., Ustawa o rachunkowości, Ustawa o świadczeniu usług drogą elektroniczną

---

## 1. Ocena istniejącego dokumentu: RODO.md (Klauzula informacyjna)

### Co jest dobrze:
- Prawidłowo wskazany administrator danych (Wspólnota jako osoba prawna, nie zarządca)
- Właściwie dobrane podstawy prawne: art. 6(1)(c) i art. 6(1)(f) RODO
- Wymienieni odbiorcy danych (Supabase, Vercel)
- Wskazane prawa podstawowe (dostęp, sprostowanie, usunięcie, skarga do UODO)

### Braki wymagające uzupełnienia:
1. **Brak prawa do sprzeciwu (art. 21 RODO)** — KRYTYCZNE, ponieważ jedną z podstaw jest art. 6(1)(f) (prawnie uzasadniony interes). Przy tej podstawie prawo do sprzeciwu jest obowiązkowe do wskazania.
2. **Brak prawa do ograniczenia przetwarzania (art. 18 RODO)** — wymagane przez art. 13(2)(b).
3. **Brak informacji o transferze danych do państw trzecich** — mimo że dane fizycznie są w UE, Supabase i Vercel to firmy amerykańskie. Należy wskazać, że dane nie są transferowane poza EOG, a dostawcy stosują odpowiednie zabezpieczenia.
4. **Brak informacji o zautomatyzowanym podejmowaniu decyzji** — art. 13(2)(f) wymaga informacji (nawet jeśli takiego przetwarzania nie ma, warto to explicite wskazać).
5. **Brak wskazania obowiązku/dobrowolności podania danych** — art. 13(2)(e) wymaga informacji, czy podanie danych jest wymogiem ustawowym, umownym, czy dobrowolnym.
6. **Brak danych kontaktowych UODO** — przy wskazaniu prawa do skargi należy podać pełne dane organu nadzorczego.
7. **Zbyt ogólny okres retencji** — „5-10 lat" jest nieprecyzyjne; warto wskazać konkretne podstawy prawne okresów przechowywania.
8. **Brak informacji o źródle danych** — jeśli dane nie są zbierane bezpośrednio od mieszkańca (np. zarządca wprowadza dane), konieczna jest klauzula z art. 14 RODO.

### Odniesienie do pytań prawnika:
- Pytania 5-8 (obowiązek informacyjny): dokument wymaga istotnego rozszerzenia
- Pytanie 19 (głosowania jako dane osobowe): brak wzmianki o przetwarzaniu danych z głosowań
- Pytanie 28 (transfer do USA): wymaga doprecyzowania

---

## 2. Ocena istniejącego dokumentu: regulamin.md

### Co jest dobrze:
- Prawidłowo określony zakres podmiotowy (właściciele lokali)
- Mechanizm oświadczeń przy pierwszym logowaniu (checkbox) — dobra praktyka
- Informacyjny charakter danych finansowych wyraźnie wskazany
- Procedura przy zbyciu lokalu zarysowana

### Braki wymagające uzupełnienia:
1. **Brak definicji pojęć** — „System", „Zarządca", „Użytkownik", „Zarząd Wspólnoty" powinny być zdefiniowane w jednym miejscu.
2. **Brak odniesienia do uchwały upoważniającej** — regulamin powinien wskazywać, że System działa na podstawie uchwały właścicieli.
3. **Brak zasad bezpieczeństwa i odpowiedzialności użytkownika** — co jeśli ktoś udostępni hasło? Kto odpowiada za głos oddany z cudzego konta?
4. **Brak ograniczenia odpowiedzialności administratora systemu** — dostępność systemu, przerwy techniczne, odpowiedzialność za błędy w danych informacyjnych.
5. **Brak procedury zmiany regulaminu** — jak wprowadzane są zmiany, jak mieszkańcy są o nich informowani.
6. **Brak katalogu czynności zabronionych** — próby włamania, udostępnianie danych innym osobom, itp.
7. **Brak szczegółów głosowania** — czas trwania głosowania, termin na oddanie głosu, kiedy głosowanie jest zamykane, czy głos można zmienić.
8. **Brak uregulowania współwłasności** — co jeśli lokal ma kilku współwłaścicieli? Kto głosuje? (art. 23 ust. 2a ustawy o własności lokali)
9. **Brak odniesienia do Polityki Prywatności** — regulamin powinien odsyłać do klauzuli RODO.
10. **Brak informacji o wymaganiach technicznych** — przeglądarka, dostęp do internetu.
11. **Brak procedury reklamacyjnej/kontaktowej** — jak zgłaszać problemy z systemem.

### Odniesienie do pytań prawnika:
- Pytania 16-18 (głosowania): regulamin musi precyzyjniej uregulować tryb głosowania elektronicznego
- Pytanie 12-15 (zmiana właściciela): procedura wymaga doprecyzowania
- Pytanie 26-27 (mailing): brak uregulowania komunikacji elektronicznej

---

## 3. Ocena istniejącego dokumentu: uchwała_3_2026.md

### Co jest dobrze:
- Prawidłowa podstawa prawna (art. 23 ust. 1 ustawy o własności lokali)
- Wskazany tryb indywidualnego zbierania głosów
- Identyfikacja właściciela przez konto z oświadczeniem
- Równoważność głosu elektronicznego z pisemnym
- Zbiorcze zestawienie głosów jako podstawa do stwierdzenia wyniku

### Uwagi:
1. **Warto dodać odniesienie do regulaminu** — § 2 ust. 3 mógłby wskazywać, że szczegółowe zasady korzystania z Systemu określa Regulamin.
2. **Warto wskazać dobrowolność** — że korzystanie z Systemu jest dobrowolne, a właściciel może głosować również w formie tradycyjnej.
3. **Brak klauzuli o ochronie danych** — uchwała powinna zawierać wzmiankę o przetwarzaniu danych osobowych lub odsyłać do Polityki Prywatności.

---

## 4. Dokumenty brakujące w zestawie

Na podstawie analizy pytań prawnika i wymogów prawnych, poza poprawionymi wersjami istniejących dokumentów, w projekcie powinny znaleźć się:

### A. Procedura naruszenia ochrony danych (data breach)
- Pytania 36-39 z listy prawnika
- Wymóg art. 33-34 RODO
- Kto zgłasza, w jakim terminie, komu

### B. Rejestr Czynności Przetwarzania (RCP)
- Pytania 30-31 z listy prawnika
- Art. 30 RODO — wspólnota raczej podlega temu obowiązkowi, bo przetwarza dane finansowe regularnie (wyjątek z art. 30 ust. 5 nie ma zastosowania)

### C. Umowy powierzenia przetwarzania danych (DPA)
- Pytania 27-29 z listy prawnika
- Art. 28 RODO — konieczne zawarcie z Supabase i Vercel
- W praktyce: akceptacja gotowych DPA tych dostawców

---

## 5. Mapowanie pytań prawnika → dokumenty

| Pytanie | Temat | Adresowane w dokumencie |
|---------|-------|------------------------|
| 1-4 | Administrator, podstawa prawna | Polityka Prywatności (RODO) |
| 5-8 | Obowiązek informacyjny | Polityka Prywatności + klauzula w Regulaminie |
| 9-11 | Dane finansowe, retencja | Regulamin + Polityka Prywatności |
| 12-15 | Zmiana właściciela | Regulamin (§ o ustaniu członkostwa) |
| 16-21 | Głosowania | Regulamin + Uchwała |
| 22-25 | Formularz kontaktowy | Polityka Prywatności |
| 26-27 | Mailing | Regulamin + Polityka Prywatności |
| 27-29 | Dostawcy IT (DPA) | Polityka Prywatności + osobne DPA |
| 30-31 | RCP | Osobny dokument (RCP) |
| 32-33 | IOD | Do rozstrzygnięcia z prawnikiem |
| 36-39 | Naruszenie danych | Osobna procedura |
| 40-42 | Zmiana zarządcy | Regulamin |
| 43-44 | Dokumenty do wdrożenia | Niniejsza analiza |

---

## 6. Pytania wymagające rozstrzygnięcia z prawnikiem

Następujące kwestie wymagają fachowej opinii prawnej i nie powinny być rozstrzygane samodzielnie:

1. **Pytanie 16**: Czy głosy elektroniczne mogą stanowić podstawę do podjęcia uchwały? — ustawa o własności lokali dopuszcza indywidualne zbieranie głosów (art. 23), ale forma elektroniczna wymaga interpretacji w kontekście formy dokumentowej (art. 77² i 77³ Kodeksu cywilnego). Uchwała 3/2026 adresuje to, ale warto potwierdzić z prawnikiem.
2. **Pytanie 32-33**: Czy wspólnota musi powołać IOD? — prawdopodobnie nie (art. 37 RODO dotyczy organów publicznych i podmiotów przetwarzających dane na dużą skalę), ale warto potwierdzić.
3. **Pytanie 44**: Czy wymagana jest DPIA (art. 35 RODO)? — prawdopodobnie nie, bo brak przetwarzania danych wrażliwych i brak profilowania, ale warto potwierdzić.
4. **Pytanie 26**: Zgoda na mailing vs. prawnie uzasadniony interes — kwestia na styku RODO i ustawy o świadczeniu usług drogą elektroniczną. Bezpieczniej uzyskać zgodę lub oprzeć się na relacji wspólnotowej.
