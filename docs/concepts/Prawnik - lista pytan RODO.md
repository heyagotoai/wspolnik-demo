# Lista pytań do prawnika — RODO / ochrona danych osobowych

> Dokument przygotowany na potrzeby konsultacji prawnej dla systemu **WM GABI** —
> aplikacji webowej do zarządzania wspólnotą mieszkaniową.
> Data przygotowania: 2026-03-22

---

## Kontekst systemu

System WM GABI to aplikacja webowa obsługująca wspólnotę mieszkaniową. Przetwarza:
- dane osobowe mieszkańców (imię, email, numer lokalu)
- dane finansowe (naliczenia opłat, historia wpłat)
- dokumenty (regulaminy, protokoły zebrań — PDF)
- głosowania nad uchwałami wspólnoty
- wiadomości z formularza kontaktowego

Administrator danych to zarządca wspólnoty. Baza danych hostowana na serwerach UE (Supabase, Frankfurt). Aplikacja na Vercel (serwery globalne, dane przechowywane w EU).

---

## 1. Podstawa prawna i administrator danych

1. Kto jest administratorem danych osobowych mieszkańców — wspólnota mieszkaniowa jako osoba prawna, czy zarządca jako podmiot zewnętrzny?
2. Jaka jest właściwa podstawa prawna przetwarzania danych mieszkańców (art. 6 RODO)?
   - Wykonanie umowy (art. 6 ust. 1 lit. b)?
   - Obowiązek prawny (art. 6 ust. 1 lit. c) — ustawa o własności lokali?
   - Prawnie uzasadniony interes (art. 6 ust. 1 lit. f)?
3. Czy wymagana jest zgoda mieszkańców (art. 6 ust. 1 lit. a) na przetwarzanie ich danych w systemie, czy wystarczy inna podstawa?
4. Czy zarządca jako podmiot zewnętrzny obsługujący system powinien być stroną umowy powierzenia przetwarzania danych z dostawcami (Supabase, Vercel)?

---

## 2. Obowiązek informacyjny (klauzula RODO)

5. Jaką formę powinien mieć obowiązek informacyjny wobec mieszkańców przy zakładaniu konta w systemie?
6. Czy wystarczy jednorazowe poinformowanie przy pierwszym logowaniu, czy klauzula powinna być podpisana osobno?
7. Co dokładnie musi zawierać klauzula informacyjna w kontekście wspólnoty mieszkaniowej?
8. Czy klauzula powinna być dostępna na stronie publicznej (polityka prywatności), i czy jest to obowiązkowe?

---

## 3. Dane finansowe i retencja

> **Kontekst:** System pełni rolę **informacyjną** — wyświetla mieszkańcowi jego saldo, naliczenia i historię wpłat. Wiążące dane finansowe (faktury, księgowość wspólnoty) są przechowywane i przetwarzane poza tym systemem, w odrębnej ewidencji księgowej.

9. Jakie dane finansowe wolno wyświetlać mieszkańcowi w panelu informacyjnym (saldo, naliczenia, wpłaty) — czy wymaga to odrębnej podstawy prawnej, czy mieści się w zakresie obsługi stosunku członkowskiego we wspólnocie?
10. Czy dane wprowadzane do systemu w celach informacyjnych (kwoty, daty naliczeń) podlegają takim samym obowiązkom retencji jak właściwa dokumentacja księgowa wspólnoty?
11. Co zrobić z danymi wyświetlanymi w systemie po wyprowadzeniu się mieszkańca — kiedy wolno je usunąć z panelu?

---

## 4. Zmiana właściciela lokalu i usunięcie danych

> **Kontekst:** W systemie każdy lokal ma przypisanego jednego aktywnego właściciela/mieszkańca. Gdy lokal zmienia właściciela, zarządca usuwa konto poprzedniego właściciela i tworzy konto nowego — w aplikacji nie ma możliwości przechowywania danych poprzednich właścicieli. Dane historyczne (historia opłat, dokumentacja) prowadzone są poza systemem, w odrębnej ewidencji.

12. Czy opisany model — usunięcie konta poprzedniego właściciela przy zmianie właściciela lokalu — jest zgodny z RODO i nie narusza żadnych obowiązków retencyjnych?
13. Czy były właściciel może żądać potwierdzenia, że jego dane zostały usunięte z systemu, i czy zarządca ma obowiązek takiego potwierdzenia udzielić?
14. Czy dane byłego właściciela (imię, email) powinny być usunięte natychmiast po zmianie, czy dopuszczalny jest krótki okres przejściowy (np. do czasu rozliczenia ostatniego okresu)?
15. Kto jest odpowiedzialny za wykonanie usunięcia konta — zarządca działający z urzędu, czy wymagany jest wniosek byłego właściciela?

---

## 5. Głosowania nad uchwałami

> **Kontekst:** Mieszkańcy głosują przez aplikację (opcje: za / przeciw / wstrzymuję się). Wyniki głosowania są następnie eksportowane do PDF, drukowane i dołączane do fizycznej dokumentacji wspólnoty jako załącznik do protokołu zebrania lub uchwały. Elektroniczne dane głosowania w systemie pełnią rolę pomocniczą.

16. Czy głosy oddane elektronicznie przez aplikację internetową mogą stanowić podstawę do podjęcia uchwały wspólnoty mieszkaniowej w świetle ustawy o własności lokali? Czy taki tryb głosowania wymaga dodatkowego uregulowania w statucie lub regulaminie wspólnoty?
17. Czy wydruk z systemu (PDF z imieniem, numerem lokalu i oddanym głosem) dołączony do protokołu zebrania jest wystarczającym dowodem ważności głosowania?
18. Jakie wymogi formalne musi spełniać lista głosów, żeby była uznana za ważny dokument potwierdzający wynik głosowania nad uchwałą?
19. Czy wyniki głosowania powiązane z danymi osobowymi (kto jak głosował) są danymi osobowymi w rozumieniu RODO i czy wymagają szczególnej ochrony lub podstawy prawnej?
20. Czy konieczne jest przechowywanie danych o głosowaniach w systemie informatycznym, jeśli dokumentacja papierowa (wydruk PDF podpisany i dołączony do protokołu) stanowi wiążący zapis uchwały? Jeśli tak — jak długo dane muszą pozostawać w systemie?
21. Czy mieszkaniec może żądać usunięcia informacji o swoim głosie z systemu — i czy koliduje to z obowiązkiem przechowywania dokumentacji uchwał wspólnoty?

---

## 6. Formularz kontaktowy i wiadomości

> **Kontekst:** Formularz kontaktowy na stronie wysyła wiadomość emailem do zarządcy. Aktualnie wiadomości są dodatkowo zapisywane w bazie danych systemu (zarządca może je przeglądać w panelu). Rozważamy wariant uproszczony: tylko wysyłka emaila, bez zapisu do bazy.

22. Czy prawo wymaga przechowywania wiadomości z formularza kontaktowego w bazie danych? Czy dopuszczalne jest przetwarzanie "w locie" — formularz generuje email do zarządcy, dane nie są nigdzie zapisywane w systemie, a jedyną kopią jest wiadomość w skrzynce pocztowej zarządcy?
23. Jeśli wariant "w locie" jest dopuszczalny — czy jest on korzystniejszy z perspektywy RODO (zasada minimalizacji danych)?
24. Jeśli jednak prawo wymaga przechowywania — na jakiej podstawie prawnej i jak długo?
25. Niezależnie od wariantu — czy przy formularzu kontaktowym musi być klauzula informacyjna o przetwarzaniu danych osobowych nadawcy?

---

## 7. Mailing do mieszkańców

26. Czy wysyłanie emaili z ogłoszeniami wspólnoty do mieszkańców wymaga ich odrębnej zgody (ustawa o świadczeniu usług drogą elektroniczną), czy wystarczy podstawa z RODO (prawnie uzasadniony interes)?
27. Czy musimy zapewnić mechanizm rezygnacji z mailingów (opt-out), jeśli podstawą nie jest zgoda?

---

## 8. Zewnętrzni dostawcy usług IT (podprocesory)

> **Kontekst techniczny dla prawnika:** Aplikacja korzysta z dwóch zewnętrznych usług chmurowych:
> - **Baza danych i logowanie użytkowników** — usługa firmy Supabase Inc. (USA), dane fizycznie przechowywane na serwerach w Niemczech (Frankfurt, UE)
> - **Hosting aplikacji** — usługa firmy Vercel Inc. (USA), aplikacja uruchomiona na serwerach w Europie, dane użytkowników przechowywane w UE
> Obie firmy są korporacjami amerykańskimi, ale ich umowy gwarantują przechowywanie danych wyłącznie w UE. Obie oferują standardowe umowy powierzenia przetwarzania danych zgodne z RODO.

27. Czy wspólnota mieszkaniowa jako administrator danych musi formalnie zawrzeć umowę powierzenia przetwarzania danych z firmami dostarczającymi infrastrukturę IT (hosting, baza danych), skoro te firmy mają swoje gotowe wzory takich umów?
28. Czy przechowywanie danych polskich obywateli na serwerach firm amerykańskich zlokalizowanych fizycznie w Niemczech (w UE) jest dopuszczalne z punktu widzenia RODO?
29. Czy wystarczy zaakceptować gotową umowę powierzenia przygotowaną przez dostawcę usługi, czy wspólnota powinna negocjować jej treść lub zlecić jej weryfikację?

---

## 9. Rejestr czynności przetwarzania (RCP)

30. Czy wspólnota mieszkaniowa jako administrator danych jest zobowiązana do prowadzenia Rejestru Czynności Przetwarzania (art. 30 RODO)?
   - Czy dotyczy to małych organizacji (< 250 pracowników) przy danych finansowych?
31. Jeśli tak — co powinien zawierać RCP dla tego systemu?

---

## 10. Inspektor Ochrony Danych (IOD)

32. Czy wspólnota mieszkaniowa jest zobowiązana do powołania Inspektora Ochrony Danych (art. 37 RODO)?
33. Jeśli nie jest obowiązkowy — czy zalecane jest dobrowolne powołanie IOD?

---

## 11. Naruszenie ochrony danych (data breach)

36. Jaką procedurę powinna wdrożyć wspólnota na wypadek naruszenia ochrony danych (np. nieautoryzowany dostęp do systemu, wyciek danych mieszkańców)?
37. Czy każde naruszenie wymaga zgłoszenia do Urzędu Ochrony Danych Osobowych (UODO) w ciągu 72 godzin, czy tylko te o wysokim ryzyku?
38. W jakich przypadkach należy informować samych mieszkańców o naruszeniu ich danych?
39. Kto ze strony wspólnoty jest odpowiedzialny za zgłoszenie naruszenia — zarządca?

---

## 12. Zmiana zarządcy wspólnoty

40. Co dzieje się z danymi osobowymi mieszkańców przechowywanymi w systemie w przypadku zmiany firmy zarządzającej wspólnotą?
41. Czy nowy zarządca może przejąć dostęp do systemu i danych bez odrębnej zgody mieszkańców, czy wymagane są jakieś formalności?
42. Czy poprzedni zarządca ma obowiązek usunięcia swoich kopii danych po przekazaniu systemu?

---

## 13. Dokumenty i regulaminy wymagane do wdrożenia

43. Jakie dokumenty prawne musimy przygotować przed uruchomieniem systemu?
    - Polityka prywatności na stronie publicznej?
    - Regulamin korzystania z systemu dla mieszkańców?
    - Klauzula informacyjna wręczana mieszkańcowi przy zakładaniu konta, czy wystarczy informacja wyświetlona podczas pierwszego logowania(później dostępna w systemie)?
    - Umowy powierzenia przetwarzania z dostawcami IT?
    - Rejestr czynności przetwarzania?
44. Czy potrzebna jest ocena skutków dla ochrony danych (DPIA — art. 35 RODO) dla tego systemu?

---

## Kontekst systemu dla prawnika

- Mała wspólnota mieszkaniowa — kilkadziesiąt lokali
- System obsługuje: konta mieszkańców, panel informacyjny (saldo, naliczenia), ogłoszenia, dokumenty, terminy zebrań, głosowania nad uchwałami, formularz kontaktowy
- **Dane finansowe właściwe (faktury, księgowość)** są przechowywane i przetwarzane poza tym systemem — system wyświetla je wyłącznie informacyjnie
- Brak przetwarzania danych wrażliwych (art. 9 RODO): brak danych o zdrowiu, poglądach politycznych, itp.
- Brak profilowania ani zautomatyzowanego podejmowania decyzji
- Dostęp: zarządca (pełny) + każdy mieszkaniec wyłącznie do własnych danych
- System zamknięty — niedostępny publicznie, konto zakłada zarządca
- Dane przechowywane wyłącznie na serwerach w Niemczech (UE), u dwóch firm z siedzibą w USA
