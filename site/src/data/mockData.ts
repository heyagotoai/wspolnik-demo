export const communityInfo = {
  name: 'Wspólnota Mieszkaniowa GABI',
  address: 'ul. Gdańska 58',
  city: '89-604 Chojnice',
  email: 'wmgabi@wp.pl',
  fullAddress: 'ul. Gdańska 58, 89-604 Chojnice',
  /** Rachunek wspólnoty (wydruki, pisma) — PKO BP */
  bankAccountFormatted: '44 1020 1491 0000 4002 0062 4007',
}

/** Teksty stałe na wydruk „Saldo” (PDF/druk) — treść zsynchronizowana z api/core/saldo_letter.py (e-mail) */
export const saldoPrintCopy = {
  paymentDueIntro: 'Prosimy o uregulowanie należności do dnia:',
  paymentRule:
    'Opłatę eksploatacyjną prosimy wpłacać „z góry” do 15 dnia każdego miesiąca, na rachunek wspólnoty w banku PKO BP nr:',
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

/** Tematy dla zalogowanych mieszkańców */
export const contactSubjectsResident = [
  'Pytanie ogólne',
  'Zgłoszenie usterki',
  'Sprawy finansowe',
  'Uchwały i zebrania',
  'Inne',
]

/** Tematy dla osób spoza wspólnoty (goście, firmy) */
export const contactSubjectsPublic = [
  'Pytanie ogólne',
  'Współpraca',
  'Inne',
]

/** @deprecated Używaj contactSubjectsResident lub contactSubjectsPublic */
export const contactSubjects = contactSubjectsPublic
