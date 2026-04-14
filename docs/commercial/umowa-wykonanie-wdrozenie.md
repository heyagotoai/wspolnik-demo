# UMOWA NR ___/2026
## na wykonanie i wdrożenie systemu informatycznego zarządzania wspólnotą mieszkaniową

zawarta w dniu _________________ 2026 r. w __________

pomiędzy:

**Wspólnotą Mieszkaniową _________________________**
z siedzibą w ___________, ul. ______________________________,
NIP: _________________________,
REGON: _________________________,
reprezentowaną przez: _______________________________ — Zarząd Wspólnoty,
zwaną dalej **„Zamawiającym"**,

a

**Marcinem Szczęsnym**,
zamieszkałym w Chojnicach, ul. _________________________,
PESEL: _________________________,
zwanym dalej **„Wykonawcą"**,

zwanymi łącznie **„Stronami"**, a każda z osobna **„Stroną"**.

---

### Oświadczenia wstępne

1. Wykonawca oświadcza, że jest członkiem Zarządu Wspólnoty Mieszkaniowej będącej Zamawiającym. W związku z potencjalnym konfliktem interesów, Strony postanawiają, co następuje:
   a) Zamawiający potwierdza, że zawarcie niniejszej Umowy zostało poprzedzone **uchwałą Wspólnoty Mieszkaniowej** nr ___/2026 z dnia __________, podjętą w trybie art. 22 ust. 2 ustawy z dnia 24 czerwca 1994 r. o własności lokali, wyrażającą zgodę na zawarcie umowy z członkiem Zarządu na warunkach w niej określonych. Uchwała stanowi Załącznik nr 4 do Umowy.
   b) Przy podpisywaniu niniejszej Umowy **Zamawiającego reprezentuje** _______________________________ — członek/członkowie Zarządu inni niż Wykonawca, lub pełnomocnik wyznaczony uchwałą Wspólnoty.
   c) Wykonawca wyłącza się z wszelkich czynności zarządu dotyczących realizacji, odbioru i rozliczenia niniejszej Umowy po stronie Zamawiającego.

2. Rozliczenie finansowe Umowy następuje za pośrednictwem platformy **Useme** (Useme.com sp. z o.o.) na warunkach opisanych w § 7.

---

## § 1. Definicje

Ilekroć w Umowie jest mowa o:

1. **System** — aplikacja internetowa do zarządzania wspólnotą mieszkaniową, opisana szczegółowo w Załączniku nr 1 (Karta Produktu), obejmująca stronę publiczną, panel mieszkańca oraz panel administracyjny.
2. **Wdrożenie** — instalacja i uruchomienie Systemu w środowisku produkcyjnym na domenie Zamawiającego, wraz z konfiguracją, migracją danych i szkoleniem.
3. **Karta Produktu** — dokument stanowiący Załącznik nr 1 do Umowy, określający pełny zakres funkcjonalny Systemu, wymagania bezpieczeństwa i wymagania niefunkcjonalne.
4. **Protokół Odbioru** — dokument potwierdzający wykonanie przedmiotu Umowy lub jej etapu, podpisany przez obie Strony.
5. **Środowisko produkcyjne** — infrastruktura hostingowa, na której System jest udostępniony użytkownikom końcowym.
6. **Dane osobowe** — dane w rozumieniu Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO).
7. **Okres gwarancji** — okres wskazany w § 9 ust. 1, liczony od daty podpisania Protokołu Odbioru Końcowego.
8. **Utrzymanie** — usługi świadczone po wdrożeniu, opisane w § 10.

---

## § 2. Przedmiot Umowy

1. Przedmiotem Umowy jest:
   a) zaprojektowanie, wykonanie i wdrożenie Systemu zgodnie z zakresem opisanym w Karcie Produktu (Załącznik nr 1),
   b) dostarczenie kodu źródłowego Systemu,
   c) dostarczenie dokumentacji technicznej i użytkowej,
   d) przeprowadzenie szkolenia dla Zamawiającego,
   e) świadczenie usług utrzymania na warunkach opisanych w § 10.

2. Szczegółowy zakres funkcjonalny Systemu określa Załącznik nr 1 — Karta Produktu.

3. System zostanie wykonany w następującym stosie technologicznym:
   - Frontend: React, TypeScript, Vite, Tailwind CSS, React Router
   - Backend: FastAPI (Python), hosting serverless (Vercel)
   - Baza danych i autoryzacja: Supabase (PostgreSQL z Row Level Security)
   - E-mail: SMTP relay na domenie Zamawiającego
   - Hosting: Vercel

---

## § 3. Harmonogram realizacji

1. Wykonawca zobowiązuje się do realizacji przedmiotu Umowy w następujących etapach:

| Etap | Zakres | Termin |
|------|--------|--------|
| I — Kick-off + MVP | Architektura, konfiguracja środowisk, strona publiczna, autoryzacja, panel admina (mieszkańcy, lokale, ogłoszenia) | do _____ 2026 r. |
| II — Finanse | Stawki, generowanie naliczeń, saldo, wydruk salda, import wpłat | do _____ 2026 r. |
| III — Głosowania + e-mail | Uchwały, głosy, eksport PDF, powiadomienia e-mail | do _____ 2026 r. |
| IV — Hardening + wdrożenie | Testy, audyt bezpieczeństwa, CI/CD, dokumentacja, deploy produkcyjny, szkolenie | do _____ 2026 r. |

2. Łączny termin realizacji: **______ tygodni** od daty zawarcia Umowy.

3. Każdy etap kończy się podpisaniem częściowego Protokołu Odbioru. Zakończenie Etapu IV potwierdza Protokół Odbioru Końcowego.

4. Terminy mogą ulec przesunięciu za pisemną zgodą obu Stron. Za przyczynę przesunięcia uznaje się w szczególności:
   a) opóźnienia w dostarczeniu materiałów lub informacji przez Zamawiającego,
   b) zmiany zakresu funkcjonalnego wprowadzone na wniosek Zamawiającego,
   c) siłę wyższą w rozumieniu § 14.

---

## § 4. Obowiązki Wykonawcy

Wykonawca zobowiązuje się do:

1. Wykonania Systemu z należytą starannością, zgodnie z Kartą Produktu i aktualnym stanem wiedzy technicznej.
2. Zapewnienia zgodności Systemu z obowiązującymi przepisami prawa, w szczególności z RODO.
3. Dostarczenia Zamawiającemu:
   a) działającej aplikacji wdrożonej na hostingu z własną domeną Zamawiającego,
   b) pełnego kodu źródłowego w repozytorium Git z historią zmian,
   c) bazy danych z migracjami SQL umożliwiającymi odtworzenie struktury od zera,
   d) testów automatycznych (jednostkowe backend i frontend, testy izolacji danych, testy E2E),
   e) dokumentacji: instrukcja wdrożeniowa, instrukcja utrzymania, instrukcja dla administratora, procedury awaryjne,
   f) konfiguracji poczty e-mail na domenie Zamawiającego.
4. Przeprowadzenia szkolenia dla Zamawiającego (administratora Systemu) w wymiarze min. _____ godzin, obejmującego obsługę panelu administracyjnego, import danych, zarządzanie mieszkańcami i uchwałami.
5. Informowania Zamawiającego o postępie prac oraz istotnych ryzykach i problemach.
6. Zachowania poufności informacji uzyskanych w związku z realizacją Umowy (§ 13).

---

## § 5. Obowiązki Zamawiającego

Zamawiający zobowiązuje się do:

1. Dostarczenia Wykonawcy niezbędnych materiałów, danych i informacji potrzebnych do realizacji Umowy, w szczególności:
   a) danych o lokalach, mieszkańcach, stawkach (w zakresie niezbędnym do konfiguracji Systemu),
   b) logotypu i materiałów graficznych (jeśli wymagane),
   c) treści regulaminu, polityki prywatności i innych dokumentów prawnych wspólnoty,
   d) danych dostępowych do domeny i skrzynki pocztowej.
2. Wyznaczenia osoby upoważnionej do kontaktu z Wykonawcą i podejmowania decyzji w zakresie realizacji Umowy.
3. Terminowego przeprowadzania odbiorów częściowych i końcowego.
4. Zapewnienia uchwały Wspólnoty Mieszkaniowej wyrażającej zgodę na zawarcie niniejszej Umowy z członkiem Zarządu, zgodnie z Oświadczeniami wstępnymi.
5. Terminowego regulowania płatności zgodnie z § 7.

---

## § 6. Odbiór

1. Po zakończeniu każdego Etapu Wykonawca zgłasza gotowość do odbioru.

2. Zamawiający ma **7 dni roboczych** na przeprowadzenie testów i zgłoszenie uwag. W przypadku braku uwag w tym terminie, Etap uznaje się za odebrany.

3. W przypadku zgłoszenia uwag:
   a) Wykonawca usuwa zgłoszone wady w terminie **7 dni roboczych** od ich otrzymania,
   b) Zamawiający ponownie weryfikuje poprawki w ciągu **5 dni roboczych**,
   c) w przypadku dalszych zastrzeżeń Strony wspólnie ustalają dalszy tryb postępowania.

4. Wady dzielą się na:
   a) **krytyczne** — uniemożliwiające korzystanie z kluczowych funkcji Systemu,
   b) **istotne** — ograniczające funkcjonalność, ale niepowodujące niemożliwości korzystania,
   c) **drobne** — usterki kosmetyczne lub nieznacznie wpływające na komfort użytkowania.

5. Wady drobne nie stanowią podstawy do odmowy podpisania Protokołu Odbioru, pod warunkiem zobowiązania się Wykonawcy do ich usunięcia w uzgodnionym terminie.

6. Protokół Odbioru Końcowego jest podstawą do uruchomienia końcowej transzy rozliczenia przez platformę Useme (§ 7).

---

## § 7. Wynagrodzenie i warunki płatności

1. Za wykonanie przedmiotu Umowy opisanego w § 2 ust. 1 lit. a)–d) Zamawiający zapłaci wynagrodzenie ryczałtowe w wysokości:

   **_________________ zł** (słownie: _________________________ złotych),

   zwane dalej „Wynagrodzeniem".

2. Wynagrodzenie obejmuje całość prac opisanych w Karcie Produktu, w tym: projektowanie, programowanie, testy, wdrożenie, konfigurację, dokumentację i szkolenie.

3. Wynagrodzenie ryczałtowe nie ulega zmianie, chyba że Strony uzgodnią na piśmie rozszerzenie zakresu funkcjonalnego Systemu. W takim przypadku Strony ustalą dodatkowe wynagrodzenie w formie aneksu.

4. Za opóźnienie w płatności przysługują odsetki ustawowe za opóźnienie.

### Rozliczenie za pośrednictwem platformy Useme

5. Rozliczenie finansowe Umowy odbywa się za pośrednictwem platformy **Useme** (Useme.com sp. z o.o., KRS 0000679082), która pełni rolę pośrednika rozliczeniowego między Zamawiającym a Wykonawcą.

6. Schemat rozliczenia:
   a) Wykonawca tworzy zlecenie na platformie Useme odpowiadające zakresowi i kwocie niniejszej Umowy (lub jej poszczególnym transzom).
   b) Zamawiający akceptuje zlecenie na platformie i dokonuje wpłaty na rachunek Useme.
   c) Useme zawiera z Wykonawcą umowę o dzieło (lub inną odpowiednią umowę cywilnoprawną), rozlicza należne podatki i składki, oraz wypłaca wynagrodzenie netto Wykonawcy.
   d) Useme wystawia Zamawiającemu **fakturę VAT** za usługę pośrednictwa (kwota Wynagrodzenia + prowizja Useme).

7. Wynagrodzenie płatne w następujących transzach (każda realizowana jako odrębne zlecenie na platformie Useme):

| Transza | Warunek | Kwota netto |
|---------|---------|-------------|
| I — Zaliczka | Po podpisaniu Umowy i utworzeniu zlecenia w Useme | _____ zł (____% Wynagrodzenia) |
| II — Etap I+II | Po podpisaniu Protokołu Odbioru Etapów I i II | _____ zł (____% Wynagrodzenia) |
| III — Końcowa | Po podpisaniu Protokołu Odbioru Końcowego | _____ zł (____% Wynagrodzenia) |

8. Zamawiający ponosi dodatkowy koszt prowizji platformy Useme (doliczanej do kwoty każdej transzy). Aktualna stawka prowizji jest określona w regulaminie Useme.

9. Strony przyjmują do wiadomości, że:
   a) **Useme pełni rolę płatnika** w rozumieniu przepisów podatkowych — oblicza i odprowadza zaliczki na PIT oraz ewentualne składki ZUS/zdrowotne od wynagrodzenia Wykonawcy,
   b) Useme sporządza i przekazuje Wykonawcy informację PIT-11,
   c) kwalifikacja podatkowa (w tym zastosowanie 50% kosztów uzyskania przychodu z tytułu praw autorskich) następuje zgodnie z oceną Useme i obowiązującymi przepisami,
   d) Zamawiający jest zwolniony z obowiązków płatnika — otrzymuje od Useme fakturę VAT jak za usługę.

10. W przypadku niedostępności platformy Useme lub rezygnacji z pośrednictwa, Strony mogą ustalić w formie aneksu alternatywny sposób rozliczenia (np. umowa o dzieło bezpośrednio, działalność gospodarcza Wykonawcy).

---

## § 8. Prawa autorskie i licencja

1. Wykonawca oświadcza, że System stanowi utwór w rozumieniu ustawy z dnia 4 lutego 1994 r. o prawie autorskim i prawach pokrewnych (t.j. Dz.U. z 2025 r. poz. ___).

2. Z chwilą zapłaty pełnego Wynagrodzenia Wykonawca udziela Zamawiającemu **niewyłącznej, bezterminowej, nieodpłatnej licencji** na korzystanie z Systemu na następujących polach eksploatacji:
   a) utrwalanie i zwielokrotnianie (w tym instalacja na serwerach),
   b) wyświetlanie, stosowanie i przechowywanie,
   c) wprowadzanie do pamięci komputera i sieci komputerowych,
   d) korzystanie przez użytkowników końcowych (mieszkańców, zarządcę, administratorów wspólnoty),
   e) modyfikowanie i tworzenie opracowań (w zakresie konfiguracji i dostosowania do potrzeb Zamawiającego).

3. Licencja obejmuje korzystanie z Systemu **wyłącznie na potrzeby Zamawiającego** (jednej wspólnoty mieszkaniowej). Zamawiający nie jest uprawniony do sublicencjonowania, odsprzedaży ani udostępniania Systemu osobom trzecim w celach komercyjnych.

4. **Majątkowe prawa autorskie** do kodu źródłowego Systemu pozostają przy Wykonawcy. Wykonawca zachowuje prawo do wykorzystania architektury, rozwiązań technicznych i kodu (w tym jako bazy do systemów dla innych podmiotów).

5. Zamawiający otrzymuje pełny dostęp do kodu źródłowego w repozytorium Git. W przypadku zakończenia współpracy z Wykonawcą, Zamawiający ma prawo zlecić dalszy rozwój i utrzymanie Systemu osobie trzeciej na podstawie udzielonej licencji.

6. Wykonawca oświadcza, że System nie narusza praw autorskich ani innych praw własności intelektualnej osób trzecich. W przypadku roszczeń osób trzecich z tego tytułu Wykonawca zobowiązuje się do ich zaspokojenia na własny koszt.

7. System może wykorzystywać biblioteki i komponenty open source na licencjach pozwalających na komercyjne użycie (MIT, Apache 2.0, BSD itp.). Wykonawca dostarczy wykaz wykorzystanych bibliotek z ich licencjami.

---

## § 9. Gwarancja

1. Wykonawca udziela gwarancji na prawidłowe działanie Systemu przez okres **12 miesięcy** od daty podpisania Protokołu Odbioru Końcowego.

2. W ramach gwarancji Wykonawca zobowiązuje się do bezpłatnego usuwania wad (błędów w oprogramowaniu) zgłoszonych przez Zamawiającego, w następujących terminach:
   a) wady krytyczne — rozpoczęcie prac naprawczych w ciągu **24 godzin**, usunięcie w ciągu **48 godzin** od zgłoszenia,
   b) wady istotne — usunięcie w ciągu **5 dni roboczych** od zgłoszenia,
   c) wady drobne — usunięcie w ciągu **14 dni roboczych** od zgłoszenia.

3. Gwarancja nie obejmuje:
   a) wad wynikających z modyfikacji Systemu dokonanych przez Zamawiającego lub osoby trzecie bez uzgodnienia z Wykonawcą,
   b) wad wynikających z nieprawidłowego użytkowania Systemu,
   c) awarii infrastruktury hostingowej (Vercel, Supabase) leżących po stronie dostawcy usług chmurowych,
   d) zmian w zewnętrznych API lub usługach, na które Wykonawca nie ma wpływu.

4. Zgłoszenia gwarancyjne Zamawiający kieruje na adres e-mail: _________________________.

---

## § 10. Utrzymanie i wsparcie (po wdrożeniu)

1. Po zakończeniu okresu wdrożenia Wykonawca świadczy usługi utrzymania Systemu na następujących warunkach:

2. Zakres usług utrzymania obejmuje:
   a) bieżący monitoring dostępności Systemu,
   b) aktualizacje bezpieczeństwa (biblioteki, zależności, poprawki krytyczne),
   c) wykonywanie i nadzór nad automatycznym tygodniowym backupem danych,
   d) wsparcie techniczne dla administratora Systemu (e-mail, do _____ zgłoszeń miesięcznie),
   e) drobne modyfikacje konfiguracyjne (np. zmiana stawek, aktualizacja treści prawnych).

3. Usługi utrzymania **nie obejmują**:
   a) rozbudowy o nowe funkcjonalności (wyceniane osobno),
   b) importu danych (czynność administratora Systemu),
   c) napraw wynikających z modyfikacji dokonanych przez osoby trzecie.

4. Wynagrodzenie za utrzymanie: **_________________ zł brutto miesięcznie** (słownie: _________________________).

5. Okres utrzymania: **12 miesięcy** od daty podpisania Protokołu Odbioru Końcowego, z automatycznym przedłużeniem na kolejne okresy 12-miesięczne, chyba że jedna ze Stron wypowie umowę utrzymania z zachowaniem **2-miesięcznego** okresu wypowiedzenia, ze skutkiem na koniec miesiąca kalendarzowego.

6. Wynagrodzenie za utrzymanie może być waloryzowane raz w roku o wskaźnik inflacji CPI publikowany przez GUS, o czym Wykonawca informuje Zamawiającego z 30-dniowym wyprzedzeniem.

---

## § 11. Ochrona danych osobowych (RODO)

1. W zakresie, w jakim Wykonawca przetwarza dane osobowe mieszkańców wspólnoty w związku z realizacją Umowy (wdrożenie, migracja danych, wsparcie techniczne), Strony zawrą odrębną **Umowę powierzenia przetwarzania danych osobowych** (DPA) stanowiącą Załącznik nr 2 do niniejszej Umowy, zgodnie z art. 28 RODO.

2. Administratorem danych osobowych mieszkańców jest Zamawiający.

3. Wykonawca zobowiązuje się do:
   a) przetwarzania danych osobowych wyłącznie w zakresie i celu niezbędnym do realizacji Umowy,
   b) zastosowania odpowiednich środków technicznych i organizacyjnych zapewniających bezpieczeństwo danych (szyfrowanie, kontrola dostępu, Row Level Security),
   c) niezwłocznego informowania Zamawiającego o wszelkich naruszeniach ochrony danych osobowych,
   d) zapewnienia, że System spełnia wymogi RODO, w tym: minimalizację danych, prawo do usunięcia, pseudonimizację w logach, automatyczną retencję danych finansowych (5 lat).

4. Po zakończeniu Umowy (i usług utrzymania) Wykonawca usunie lub zwróci wszystkie dane osobowe, do których miał dostęp w związku z realizacją Umowy — według wyboru Zamawiającego.

---

## § 12. Odpowiedzialność

1. Wykonawca ponosi odpowiedzialność za szkody wyrządzone Zamawiającemu wskutek niewykonania lub nienależytego wykonania Umowy, z zastrzeżeniem ust. 2–4.

2. Odpowiedzialność Wykonawcy z tytułu niewykonania lub nienależytego wykonania Umowy jest ograniczona do **wysokości Wynagrodzenia** określonego w § 7 ust. 1. Ograniczenie to nie dotyczy szkód wyrządzonych umyślnie.

3. Wykonawca nie ponosi odpowiedzialności za:
   a) przerwy w działaniu Systemu spowodowane awarią infrastruktury dostawców usług chmurowych (Vercel, Supabase),
   b) utratę danych spowodowaną działaniem Zamawiającego lub osób trzecich,
   c) skutki korzystania z Systemu niezgodnie z dokumentacją lub instrukcją,
   d) opóźnienia wynikające z niedostarczenia materiałów lub informacji przez Zamawiającego.

4. Żadna ze Stron nie ponosi odpowiedzialności za utracone korzyści (lucrum cessans), chyba że szkoda została wyrządzona umyślnie.

---

## § 13. Poufność

1. Strony zobowiązują się do zachowania w tajemnicy wszelkich informacji poufnych uzyskanych w związku z realizacją Umowy, w szczególności:
   a) danych osobowych mieszkańców wspólnoty,
   b) danych finansowych wspólnoty,
   c) warunków handlowych Umowy,
   d) know-how i rozwiązań technicznych (w zakresie nieobjętym prawami autorskimi Wykonawcy).

2. Obowiązek poufności nie dotyczy informacji:
   a) publicznie dostępnych,
   b) uzyskanych od osób trzecich bez naruszenia obowiązku poufności,
   c) których ujawnienie jest wymagane przez przepisy prawa lub prawomocne orzeczenie sądu.

3. Obowiązek poufności obowiązuje w trakcie trwania Umowy oraz przez okres **3 lat** od jej zakończenia.

---

## § 14. Siła wyższa

1. Żadna ze Stron nie ponosi odpowiedzialności za niewykonanie lub nienależyte wykonanie Umowy, jeżeli jest to spowodowane siłą wyższą.

2. Za siłę wyższą uznaje się zdarzenia zewnętrzne, niemożliwe do przewidzenia i zapobieżenia, w szczególności: klęski żywiołowe, działania wojenne, strajki, awarie infrastruktury energetycznej lub telekomunikacyjnej o zasięgu regionalnym, epidemie, akty terroryzmu, decyzje organów władzy publicznej uniemożliwiające realizację Umowy.

3. Strona dotknięta siłą wyższą niezwłocznie powiadomi drugą Stronę o zaistnieniu i ustaniu okoliczności siły wyższej.

4. Jeżeli siła wyższa trwa dłużej niż **60 dni**, każda ze Stron może odstąpić od Umowy bez obowiązku zapłaty kar umownych, z zachowaniem prawa do wynagrodzenia za dotychczas wykonane prace.

---

## § 15. Kary umowne

1. Wykonawca zapłaci Zamawiającemu kary umowne w następujących przypadkach:
   a) za opóźnienie w realizacji poszczególnych Etapów — **0,5%** Wynagrodzenia za każdy rozpoczęty tydzień opóźnienia, nie więcej niż **10%** Wynagrodzenia,
   b) za odstąpienie od Umowy z przyczyn leżących po stronie Wykonawcy — **20%** Wynagrodzenia.

2. Zamawiający zapłaci Wykonawcy kary umowne w następujących przypadkach:
   a) za odstąpienie od Umowy z przyczyn leżących po stronie Zamawiającego — **20%** Wynagrodzenia,
   b) za opóźnienie w dostarczeniu materiałów niezbędnych do realizacji Umowy, powodujące przestój w pracach — **0,5%** Wynagrodzenia za każdy rozpoczęty tydzień opóźnienia, nie więcej niż **10%** Wynagrodzenia.

3. Strony zastrzegają sobie prawo dochodzenia odszkodowania przewyższającego wysokość kar umownych na zasadach ogólnych.

4. Kary umowne nie obowiązują w przypadku siły wyższej (§ 14) ani w przypadku uzgodnionego przez Strony przesunięcia terminów.

---

## § 16. Odstąpienie od Umowy

1. Zamawiający może odstąpić od Umowy w przypadku:
   a) opóźnienia Wykonawcy w realizacji któregokolwiek Etapu o więcej niż **4 tygodnie**, po uprzednim wezwaniu do wykonania w dodatkowym terminie **14 dni**,
   b) utraty przez Wykonawcę zdolności do realizacji Umowy.

2. Wykonawca może odstąpić od Umowy w przypadku:
   a) opóźnienia Zamawiającego w płatności przekraczającego **30 dni**, po uprzednim wezwaniu do zapłaty w dodatkowym terminie **14 dni**,
   b) niedostarczenia przez Zamawiającego materiałów niezbędnych do realizacji przez okres dłuższy niż **30 dni** od wezwania.

3. W przypadku odstąpienia od Umowy:
   a) Wykonawca zachowuje prawo do wynagrodzenia za dotychczas wykonane i odebrane Etapy,
   b) Wykonawca przekazuje Zamawiającemu kod źródłowy i dokumentację dotychczas wykonanych prac,
   c) zastosowanie mają kary umowne z § 15 ust. 1 lit. b) lub ust. 2 lit. a), odpowiednio do przyczyny odstąpienia.

4. Oświadczenie o odstąpieniu wymaga formy pisemnej pod rygorem nieważności.

---

## § 17. Infrastruktura i koszty hostingu

1. Koszty usług hostingowych i chmurowych (Vercel, Supabase, domena) ponosi Zamawiający lub są pokrywane w ramach wynagrodzenia za utrzymanie — zgodnie z ustaleniami Stron.

2. Wykonawca dostarczy dokumentację kosztów infrastrukturowych, w tym szacowane miesięczne koszty na darmowych i płatnych planach dostawców.

3. Zamawiający jest właścicielem kont usługowych (Vercel, Supabase, domena) lub konta te zostaną na niego przepisane w ramach wdrożenia.

---

## § 18. Postanowienia końcowe

1. W sprawach nieuregulowanych niniejszą Umową zastosowanie mają przepisy:
   a) ustawy z dnia 23 kwietnia 1964 r. — Kodeks cywilny (w szczególności przepisy o umowie o dzieło, art. 627–646),
   b) ustawy z dnia 4 lutego 1994 r. o prawie autorskim i prawach pokrewnych,
   c) Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO),
   d) ustawy z dnia 24 czerwca 1994 r. o własności lokali.

2. Wszelkie zmiany i uzupełnienia Umowy wymagają formy pisemnej (aneks) pod rygorem nieważności.

3. Wszelkie spory wynikające z Umowy Strony będą rozstrzygać polubownie. W przypadku braku porozumienia spory będą rozstrzygane przez sąd powszechny właściwy dla siedziby Zamawiającego.

4. Umowa wchodzi w życie z dniem podpisania przez obie Strony.

5. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze Stron.

---

## Załączniki

1. **Załącznik nr 1** — Karta Produktu (zakres funkcjonalny Systemu)
2. **Załącznik nr 2** — Umowa powierzenia przetwarzania danych osobowych (DPA)
3. **Załącznik nr 3** — Protokół Odbioru Końcowego (wzór)
4. **Załącznik nr 4** — Uchwała Wspólnoty Mieszkaniowej wyrażająca zgodę na zawarcie Umowy z członkiem Zarządu

---

<br><br>

| | |
|---|---|
| **Zamawiający:** | **Wykonawca:** |
| | |
| _________________________________ | _________________________________ |
| (podpis i pieczęć Wspólnoty) | (podpis) |
| | |
| Data: _________________ | Data: _________________ |
