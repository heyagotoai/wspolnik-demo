import { communityInfo } from '../../data/mockData'

function LegalDocLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <>
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-16 md:py-20">
          <h1 className="text-3xl md:text-4xl font-semibold text-charcoal tracking-tight mb-3">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-lg text-slate max-w-2xl">{subtitle}</p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-[720px] px-6 py-12 md:py-16">
        <div
          role="status"
          className="mb-10 rounded-[16px] border border-amber-200/90 bg-amber-light/40 px-5 py-4 text-sm text-charcoal leading-relaxed"
        >
          <strong className="font-semibold">Wersja demonstracyjna.</strong> Poniższy tekst ma charakter przykładowy i
          nie zastępuje dokumentów przygotowanych przez radcę prawnego ani doradcę RODO dla realnej wspólnoty.
        </div>
        <div className="space-y-5 text-[15px] leading-relaxed text-slate">{children}</div>
      </div>
    </>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-charcoal pt-2">{children}</h2>
}

export function PrivacyPolicyPage() {
  return (
    <LegalDocLayout
      title="Polityka prywatności"
      subtitle="Zasady przetwarzania danych osobowych w serwisie internetowym wspólnoty (wersja demo)."
    >
      <p>
        Niniejsza polityka dotyczy przykładowej wspólnoty <strong className="text-charcoal">{communityInfo.name}</strong>{' '}
        oraz demonstracyjnej witryny pokazującej działanie oprogramowania — w produkcji treść powinna być dostosowana do
        faktycznych procesów i umów powierzenia.
      </p>

      <H2>Administrator danych</H2>
      <p>
        Administratorem danych osobowych jest wspólnota mieszkaniowa w rozumieniu ustawy o własności lokali, reprezentowana
        przez zarząd (w wersji demo używane są dane kontaktowe z nagłówka strony).
      </p>

      <H2>Zakres i cele przetwarzania</H2>
      <p>
        W ramach serwisu mogą być przetwarzane m.in.: imię i nazwisko, adres e-mail, numer lokalu, dane niezbędne do
        rozliczeń i komunikacji z mieszkańcami, a także logi techniczne związane z zapewnieniem bezpieczeństwa usługi.
      </p>

      <H2>Podstawy prawne</H2>
      <p>
        Przetwarzanie odbywa się zgodnie z RODO — m.in. wykonanie umowy, obowiązki prawne ciążące na administratorze,
        prawnie uzasadniony interes (np. bezpieczeństwo systemu), a w wymaganych przypadkach na podstawie zgody.
      </p>

      <H2>Okres przechowywania</H2>
      <p>
        Dane przechowywane są przez czas trwania stosunku prawnego oraz przez okres wymagany przepisami (np. podatkowymi
        i rachunkowymi), a następnie usuwane lub anonimizowane.
      </p>

      <H2>Prawa osób, których dane dotyczą</H2>
      <p>
        Przysługuje Państwu m.in. prawo dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania,
        sprzeciwu oraz przenoszenia danych — w granicach określonych przepisami. Można złożyć skargę do organu nadzorczego
        (Prezes UODO).
      </p>
    </LegalDocLayout>
  )
}

export function GdprClausePage() {
  return (
    <LegalDocLayout
      title="Klauzula informacyjna RODO"
      subtitle="Informacja z art. 13 rozporządzenia o ochronie danych osobowych (wersja demo)."
    >
      <p>
        Zgodnie z art. 13 ust. 1 i 2 RODO informujemy, że przykładowy administrator danych w ramach tej demonstracji to{' '}
        <strong className="text-charcoal">{communityInfo.name}</strong> (kontakt: {communityInfo.email}).
      </p>

      <H2>Cele i podstawy przetwarzania</H2>
      <ul className="list-disc pl-5 space-y-2">
        <li>realizacja praw i obowiązków wynikających z prawa własności i zarządu nieruchomością wspólną;</li>
        <li>rozliczenia i obsługa płatności związanych z utrzymaniem nieruchomości;</li>
        <li>komunikacja z mieszkańcami (m.in. powiadomienia, odpowiedzi na zgłoszenia);</li>
        <li>zapewnienie bezpieczeństwa IT i prowadzenie dokumentacji w wymiarze wymaganym przepisami.</li>
      </ul>

      <H2>Odbiorcy danych</H2>
      <p>
        Dane mogą być przekazywane podmiotom przetwarzającym je na zlecenie (np. hosting, operator poczty), organom publicznym
        gdy wystąpi obowiązek prawny oraz podmiotom współpracującym na podstawie umów — wyłącznie w zakresie niezbędnym.
      </p>

      <H2>Okres przechowywania</H2>
      <p>
        Dane są przechowywane przez czas realizacji celów, a następnie przez okres przedawnienia roszczeń lub retencji
        wynikającej z przepisów — zgodnie z wewnętrzną polityką retencji wspólnoty (w produkcji do opracowania).
      </p>

      <H2>Prawa</H2>
      <p>
        Przysługuje Państwu dostęp do danych, ich sprostowanie, usunięcie lub ograniczenie przetwarzania, wniesienie
        sprzeciwu wobec przetwarzania oraz wniesienie skargi do Prezesa Urzędu Ochrony Danych Osobowych.
      </p>
    </LegalDocLayout>
  )
}

export function CommunityRulesPage() {
  return (
    <LegalDocLayout
      title="Regulamin wspólnoty"
      subtitle="Przykładowe zasady korzystania z nieruchomości wspólnej — treść do zastąpienia uchwałą i dokumentem prawnym."
    >
      <p>
        Regulamin określa podstawowe zasady współżycia mieszkańców <strong className="text-charcoal">{communityInfo.name}</strong>.
        W środowisku demonstracyjnym pełni rolę szablonu — w rzeczywistej wspólności powinien wynikać z obowiązujących uchwał
        i przepisów prawa.
      </p>

      <H2>1. Postanowienia ogólne</H2>
      <p>
        Mieszkańcy i użytkownicy lokali zobowiązani są do przestrzegania przepisów prawa, statutu wspólnoty oraz uchwał
        wspólnoty i regulaminów części wspólnych.
      </p>

      <H2>2. Części wspólne</H2>
      <p>
        Z części wspólnych należy korzystać w sposób nieutrudniający innym korzystania z nieruchomości; zabrania się
        pozostawiania przedmiotów w klatkach schodowych i miejscach ewakuacyjnych, chyba że uchwała stanowi inaczej.
      </p>

      <H2>3. Prace i remonty</H2>
      <p>
        Roboty mogące naruszyć konstrukcję budynku lub instalacje wspólne wymagają zgody zarządu lub uchwały — według przepisów
        i dokumentów wspólnoty.
      </p>

      <H2>4. Gospodarka odpadami</H2>
      <p>
        Odpady należy segregować zgodnie z harmonogramem odbioru i wytycznymi gminy; zabrania się pozostawiania odpadów
        poza wyznaczonymi pojemnikami.
      </p>

      <H2>5. Postanowienia końcowe</H2>
      <p>
        W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy powszechnie obowiązujące oraz uchwały
        wspólnoty. Regulamin może zostać zmieniony uchwałą wspólnoty.
      </p>
    </LegalDocLayout>
  )
}
