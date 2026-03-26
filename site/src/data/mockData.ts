/** Dane demonstracyjne (fikcyjne) — repozytorium wspolnik-demo */
export const communityInfo = {
  name: 'Wspólnota Mieszkaniowa „Zielone Tarasy”',
  /** Sidebar, stopki druku, logo alt */
  shortName: 'Wspólnik',
  address: 'ul. Lipowa 24',
  city: '00-001 Warszawa',
  email: 'zarzad@demo.wspolnik.example',
  fullAddress: 'ul. Lipowa 24, 00-001 Warszawa',
  /** Rachunek fikcyjny (wydruki salda — nie używać do realnych wpłat) */
  bankAccountFormatted: '12 3456 7890 0000 1234 5678 9012',
  /** Pierwsza część linii „miejscowość, data” na wydruku salda */
  saldoPrintCity: 'Warszawa',
  /** Stopka w podglądzie druku głosów (uchwały) */
  footerWebsite: 'demo.wspolnik.example',
} as const

/** Teksty stałe na wydruk „Saldo” (PDF/druk) — treść zsynchronizowana z api/core/saldo_letter.py (e-mail) */
export const saldoPrintCopy = {
  paymentDueIntro: 'Prosimy o uregulowanie należności do dnia:',
  paymentRule:
    'Opłatę eksploatacyjną prosimy wpłacać „z góry” do 15 dnia każdego miesiąca, na rachunek wspólnoty nr:',
  transferNote: 'Przy wpłacie należy podać nr lokalu i okres, za który dokonana jest wpłata.',
  /** Nadpłata — zamiast terminu spłaty zadłużenia */
  overpaymentSettlement:
    'Prosimy o odliczenie nadpłaconej kwoty od opłaty eksploatacyjnej za kolejny miesiąc rozliczeniowy.',
} as const

export const navLinks = [
  { label: 'Strona Główna', path: '/' },
  { label: 'Aktualności', path: '/aktualnosci' },
  { label: 'Dokumenty', path: '/dokumenty' },
  { label: 'Kontakt', path: '/kontakt' },
]

export const announcements = [
  {
    id: 1,
    title: 'Zebranie roczne wspólnoty',
    date: '2026-04-15',
    excerpt: 'Zapraszamy wszystkich mieszkańców na coroczne zebranie wspólnoty. W programie: sprawozdanie finansowe, plan remontów oraz wybór nowych członków zarządu.',
    pinned: true,
  },
  {
    id: 2,
    title: 'Prace konserwacyjne instalacji wodnej',
    date: '2026-03-28',
    excerpt: 'Informujemy o planowanych pracach konserwacyjnych instalacji wodnej w dniach 28-29 marca. Możliwe krótkie przerwy w dostawie wody.',
    pinned: false,
  },
  {
    id: 3,
    title: 'Zmiana godzin odbioru odpadów',
    date: '2026-03-20',
    excerpt: 'Od 1 kwietnia zmieniają się godziny odbioru odpadów segregowanych. Prosimy o zapoznanie się z nowym harmonogramem.',
    pinned: false,
  },
  {
    id: 4,
    title: 'Remont klatki schodowej — harmonogram',
    date: '2026-03-15',
    excerpt: 'Rozpoczynamy prace remontowe klatki schodowej. Prace potrwają do końca kwietnia. Przepraszamy za utrudnienia.',
    pinned: false,
  },
  {
    id: 5,
    title: 'Przegląd instalacji gazowej',
    date: '2026-03-10',
    excerpt: 'Przypominamy o obowiązkowym przeglądzie instalacji gazowej. Prosimy o umożliwienie dostępu do mieszkań w wyznaczonym terminie.',
    pinned: false,
  },
]

export const importantDates = [
  { date: '2026-04-15', event: 'Zebranie roczne wspólnoty' },
  { date: '2026-04-30', event: 'Termin płatności zaliczki' },
  { date: '2026-05-10', event: 'Przegląd instalacji gazowej' },
  { date: '2026-05-20', event: 'Sprzątanie terenu wspólnoty' },
]

export const documents = [
  {
    id: 1,
    name: 'Regulamin porządku domowego',
    category: 'Regulaminy',
    date: '2026-01-15',
    size: '245 KB',
  },
  {
    id: 2,
    name: 'Regulamin korzystania z części wspólnych',
    category: 'Regulaminy',
    date: '2025-11-20',
    size: '180 KB',
  },
  {
    id: 3,
    name: 'Protokół zebrania — marzec 2026',
    category: 'Protokoły',
    date: '2026-03-18',
    size: '320 KB',
  },
  {
    id: 4,
    name: 'Protokół zebrania — grudzień 2025',
    category: 'Protokoły',
    date: '2025-12-20',
    size: '290 KB',
  },
  {
    id: 5,
    name: 'Wniosek o zgodę na remont',
    category: 'Formularze',
    date: '2026-02-01',
    size: '95 KB',
  },
  {
    id: 6,
    name: 'Zgłoszenie usterki',
    category: 'Formularze',
    date: '2026-02-01',
    size: '85 KB',
  },
  {
    id: 7,
    name: 'Uchwała nr 1/2026 — Plan remontów',
    category: 'Uchwały',
    date: '2026-01-20',
    size: '150 KB',
  },
  {
    id: 8,
    name: 'Sprawozdanie finansowe 2025',
    category: 'Sprawozdania',
    date: '2026-02-28',
    size: '520 KB',
  },
]

export const documentCategories = [
  'Wszystkie',
  'Regulaminy',
  'Protokoły',
  'Formularze',
  'Uchwały',
  'Sprawozdania',
]

export const emergencyContacts = [
  { name: 'Numer alarmowy', number: '112' },
  { name: 'Straż pożarna', number: '998' },
  { name: 'Pogotowie gazowe', number: '992' },
  { name: 'Pogotowie wodociągowe', number: '994' },
]

export const communityValues = [
  {
    title: 'Bezpieczeństwo',
    description: 'Dbamy o bezpieczeństwo wszystkich mieszkańców. Monitorujemy stan techniczny budynku i reagujemy na każde zgłoszenie.',
    icon: 'shield',
  },
  {
    title: 'Współpraca',
    description: 'Decyzje podejmujemy wspólnie, szanując głos każdego mieszkańca. Razem tworzymy przestrzeń, w której chce się żyć.',
    icon: 'handshake',
  },
  {
    title: 'Komfort',
    description: 'Regularnie inwestujemy w utrzymanie i modernizację budynku, zapewniając komfortowe warunki mieszkania.',
    icon: 'home',
  },
]

export const contactSubjects = [
  'Pytanie ogólne',
  'Zgłoszenie usterki',
  'Sprawy finansowe',
  'Inne',
]
