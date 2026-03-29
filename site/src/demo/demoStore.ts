import { DEMO_USER_EMAIL, DEMO_USER_ID } from './demoConstants'

export type DemoRole = 'admin' | 'resident' | 'manager'

export interface DemoResident {
  id: string
  email: string
  full_name: string
  apartment_number: string | null
  role: DemoRole
  is_active: boolean
  created_at: string
}

export interface DemoApartment {
  id: string
  number: string
  area_m2: number | null
  share: number | null
  declared_occupants: number
  initial_balance: number
  initial_balance_date: string | null
  owner_resident_id: string | null
  billing_group_id: string | null
}

export interface DemoBillingGroupRow {
  id: string
  name: string
  created_at: string
}

export interface DemoAnnouncement {
  id: string
  title: string
  content: string
  excerpt: string | null
  is_pinned: boolean
  email_sent_at: string | null
  created_at: string
  author_id?: string | null
}

export interface DemoImportantDate {
  id: string
  title: string
  date: string
  description: string | null
}

export interface DemoDocument {
  id: string
  name: string
  category: string
  file_path: string
  file_size: string | null
  is_public: boolean
  created_at: string
  uploaded_by?: string | null
}

export interface DemoCharge {
  id: string
  apartment_id: string
  month: string
  type: string
  amount: number
  description: string | null
  is_auto_generated: boolean
}

export interface DemoPayment {
  id: string
  apartment_id: string
  amount: number
  confirmed_by_admin: boolean
  payment_date?: string
  title?: string | null
  parent_payment_id?: string | null
}

export interface DemoResolution {
  id: string
  title: string
  description: string | null
  document_id: string | null
  voting_start: string | null
  voting_end: string | null
  status: string
  created_at: string
}

export interface DemoVote {
  id: string
  resolution_id: string
  resident_id: string
  vote: string
  voted_at: string
}

export interface DemoContactMessage {
  id: string
  name: string
  email: string
  apartment_number: string | null
  subject: string
  message: string
  is_read: boolean
  created_at: string
}

export interface DemoChargeRate {
  id: string
  type: string
  rate_per_unit: string
  valid_from: string
  created_at: string
}

export interface DemoAuditEntry {
  id: string
  user_id: string | null
  user_name: string
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface DemoChargesExtra {
  autoConfig: { enabled: boolean; day: number }
  zawiadomienie: { legal_basis: string }
}

function iso(d: Date) {
  return d.toISOString()
}

/** 12 ostatnich hex cyfr — spójne identyfikatory seedu (łatwe do audytu w demo). */
function gid(prefix: 'g' | 'h' | 'k' | 'i' | 'e' | 'd' | 'f' | 'j', n: number): string {
  const p =
    prefix === 'g'
      ? 'g1000000-0000-4000-8000-'
      : prefix === 'h'
        ? 'h1000000-0000-4000-8000-'
        : prefix === 'k'
          ? 'k1000000-0000-4000-8000-'
          : prefix === 'i'
            ? 'i1000000-0000-4000-8000-'
            : prefix === 'e'
              ? 'e1000000-0000-4000-8000-'
              : prefix === 'd'
                ? 'd1000000-0000-4000-8000-'
                : prefix === 'j'
                  ? 'j1000000-0000-4000-8000-'
                  : 'f1000000-0000-4000-8000-'
  return `${p}${n.toString(16).padStart(12, '0')}`
}

function seed() {
  const now = new Date()
  const bgSekcja1 = 'l1000000-0000-4000-8000-000000000001'
  const bgSekcja2 = 'l1000000-0000-4000-8000-000000000002'

  const resVoting = 'c1000000-0000-4000-8000-000000000001'
  const resClosed = 'c1000000-0000-4000-8000-000000000002'
  const resDraft = 'c1000000-0000-4000-8000-000000000003'
  const resDraftFin = 'c1000000-0000-4000-8000-000000000004'

  const docRegulamin = 'f1000000-0000-4000-8000-000000000001'
  const docUchwala = 'f1000000-0000-4000-8000-000000000002'

  const aptSpecs: {
    id: string
    number: string
    area: number
    share: number
    occupants: number
    balance: number
    ownerIdx: number
    group: 1 | 2
  }[] = [
    { id: 'b6000000-0000-4000-8000-000000000006', number: '1', area: 52, share: 0.038, occupants: 2, balance: -12.4, ownerIdx: 5, group: 1 },
    { id: 'b7000000-0000-4000-8000-000000000007', number: '2', area: 54, share: 0.039, occupants: 3, balance: 0, ownerIdx: 6, group: 1 },
    { id: 'b3000000-0000-4000-8000-000000000003', number: '3', area: 42, share: 0.028, occupants: 2, balance: -45.2, ownerIdx: 2, group: 1 },
    { id: 'b8000000-0000-4000-8000-000000000008', number: '4', area: 61, share: 0.041, occupants: 2, balance: 88.0, ownerIdx: 7, group: 1 },
    { id: 'b2000000-0000-4000-8000-000000000002', number: '5', area: 48, share: 0.032, occupants: 2, balance: 0, ownerIdx: 1, group: 1 },
    { id: 'b9000000-0000-4000-8000-000000000009', number: '6', area: 55, share: 0.038, occupants: 2, balance: 22.1, ownerIdx: 8, group: 1 },
    { id: 'ba000000-0000-4000-8000-00000000000a', number: '7', area: 59, share: 0.04, occupants: 3, balance: -5.0, ownerIdx: 9, group: 1 },
    { id: 'bb000000-0000-4000-8000-00000000000b', number: '8', area: 50, share: 0.033, occupants: 2, balance: 150.0, ownerIdx: 10, group: 1 },
    { id: 'bc000000-0000-4000-8000-00000000000c', number: '11', area: 63, share: 0.042, occupants: 3, balance: 40.0, ownerIdx: 11, group: 2 },
    { id: 'b1000000-0000-4000-8000-000000000001', number: '12', area: 65, share: 0.045, occupants: 3, balance: 120.5, ownerIdx: 0, group: 1 },
    { id: 'b4000000-0000-4000-8000-000000000004', number: '18', area: 72, share: 0.052, occupants: 4, balance: 340.0, ownerIdx: 3, group: 2 },
    { id: 'b5000000-0000-4000-8000-000000000005', number: '24', area: 58, share: 0.041, occupants: 3, balance: 15.75, ownerIdx: 4, group: 2 },
  ]

  const ownerIds = [
    DEMO_USER_ID,
    'a2000000-0000-4000-8000-000000000002',
    'a3000000-0000-4000-8000-000000000003',
    'a4000000-0000-4000-8000-000000000004',
    'a5000000-0000-4000-8000-000000000005',
    'a6000000-0000-4000-8000-000000000006',
    'a7000000-0000-4000-8000-000000000007',
    'a8000000-0000-4000-8000-000000000008',
    'a9000000-0000-4000-8000-000000000009',
    'aa000000-0000-4000-8000-00000000000a',
    'ab000000-0000-4000-8000-00000000000b',
    'ac000000-0000-4000-8000-00000000000c',
  ]

  const ownerNames = [
    'Jan Kowalski (demo)',
    'Anna Nowak (demo)',
    'Piotr Wiśniewski (demo)',
    'Maria Zielińska (demo)',
    'Tomasz Lewandowski (demo)',
    'Ewa Kamińska (demo)',
    'Michał Dąbrowski (demo)',
    'Katarzyna Piotrowska (demo)',
    'Grzegorz Mazur (demo)',
    'Alicja Jabłońska (demo)',
    'Robert Wójcik (demo)',
    'Natalia Król (demo)',
  ]

  const emails = [
    DEMO_USER_EMAIL,
    'drugi.demo@wspolnik-demo.local',
    'trzeci.demo@wspolnik-demo.local',
    'czwarty.demo@wspolnik-demo.local',
    'piaty.demo@wspolnik-demo.local',
    'szosty.demo@wspolnik-demo.local',
    'siodmy.demo@wspolnik-demo.local',
    'osmy.demo@wspolnik-demo.local',
    'dziewiaty.demo@wspolnik-demo.local',
    'dziesiaty.demo@wspolnik-demo.local',
    'jedenasty.demo@wspolnik-demo.local',
    'dwunasty.demo@wspolnik-demo.local',
  ]

  const residents: DemoResident[] = ownerIds.map((id, i) => ({
    id,
    email: emails[i],
    full_name: ownerNames[i],
    apartment_number: aptSpecs.find((a) => a.ownerIdx === i)?.number ?? null,
    role: 'resident',
    is_active: true,
    created_at: iso(now),
  }))

  const billing_groups: DemoBillingGroupRow[] = [
    { id: bgSekcja1, name: 'Sekcja I — bloki A–C (demo)', created_at: iso(now) },
    { id: bgSekcja2, name: 'Sekcja II — bloki D–E (demo)', created_at: iso(now) },
  ]

  const apartments: DemoApartment[] = aptSpecs.map((s) => ({
    id: s.id,
    number: s.number,
    area_m2: s.area,
    share: s.share,
    declared_occupants: s.occupants,
    initial_balance: s.balance,
    initial_balance_date: '2025-01-01',
    owner_resident_id: ownerIds[s.ownerIdx],
    billing_group_id: s.group === 1 ? bgSekcja1 : bgSekcja2,
  }))

  const announcements: DemoAnnouncement[] = [
    {
      id: gid('d', 1),
      title: 'Zebranie wspólnoty — wiosna 2026',
      content:
        'Porządek obrad: sprawozdanie finansowe, uchwały z załącznikami (dokument w zakładce Dokumenty). Szczegóły w terminach.',
      excerpt: 'Zebranie i porządek obrad.',
      is_pinned: true,
      email_sent_at: null,
      created_at: iso(now),
      author_id: DEMO_USER_ID,
    },
    {
      id: gid('d', 2),
      title: 'Harmonogram prac remontowych',
      content: 'Wykaz prac zgodny z uchwałą o funduszu remontowym — terminy w zakładce Terminy.',
      excerpt: 'Remonty',
      is_pinned: false,
      email_sent_at: null,
      created_at: iso(now),
      author_id: DEMO_USER_ID,
    },
    {
      id: gid('d', 3),
      title: 'Przypomnienie: głosowanie nad uchwałą',
      content:
        'Trwa głosowanie elektroniczne (uchwała demonstracyjna). Zagłosuj w panelu Głosowania. Daty końca w Terminach i przy uchwale.',
      excerpt: 'Głosowanie',
      is_pinned: true,
      email_sent_at: null,
      created_at: iso(now),
      author_id: DEMO_USER_ID,
    },
    {
      id: gid('d', 4),
      title: 'Zbiórka na fundusz remontowy',
      content: 'Naliczenia miesięczne widoczne w Finanse — dla lokalu zgodnie z numerem w profilu.',
      excerpt: 'Fundusz',
      is_pinned: false,
      email_sent_at: null,
      created_at: iso(now),
      author_id: DEMO_USER_ID,
    },
    {
      id: gid('d', 5),
      title: 'Oświetlenie klatek',
      content: 'Prace zamknięte — faktura w dokumentach (kategoria: techniczne).',
      excerpt: 'Oświetlenie',
      is_pinned: false,
      email_sent_at: null,
      created_at: iso(now),
      author_id: DEMO_USER_ID,
    },
    {
      id: gid('d', 6),
      title: 'Kontakt z administracją',
      content: 'Wiadomości z formularza Kontakt trafiają do Wiadomości w panelu admina.',
      excerpt: 'Kontakt',
      is_pinned: false,
      email_sent_at: null,
      created_at: iso(now),
      author_id: DEMO_USER_ID,
    },
  ]

  const important_dates: DemoImportantDate[] = [
    {
      id: gid('e', 1),
      title: 'Zebranie wspólnoty',
      date: '2026-04-15',
      description: 'Powiązane z ogłoszeniem „Zebranie wspólnoty — wiosna 2026”.',
    },
    {
      id: gid('e', 2),
      title: 'Koniec głosowania — uchwała demonstracyjna',
      date: '2030-12-31',
      description: 'Zgodnie z datą końcową głosowania przy uchwale w module Uchwały.',
    },
    {
      id: gid('e', 3),
      title: 'Zbiórka na fundusz remontowy',
      date: '2026-12-31',
      description: 'Jak w ogłoszeniu o funduszu.',
    },
    {
      id: gid('e', 4),
      title: 'Przegląd techniczny budynku',
      date: '2026-06-01',
      description: 'Termin zaplanowanych oględzin.',
    },
    {
      id: gid('e', 5),
      title: 'Spotkanie z zarządcą',
      date: '2026-05-20',
      description: 'Dostępne dla mieszkańców zgodnie z kalendarzem.',
    },
    {
      id: gid('e', 6),
      title: 'Zamknięcie roku finansowego (demo)',
      date: '2026-12-31',
      description: 'Symulacja terminu rozliczenia.',
    },
  ]

  const documents: DemoDocument[] = [
    {
      id: docRegulamin,
      name: 'Regulamin wspólnoty (demo)',
      category: 'regulamin',
      file_path: 'demo/regulamin.pdf',
      file_size: '120 KB',
      is_public: true,
      created_at: iso(now),
      uploaded_by: DEMO_USER_ID,
    },
    {
      id: docUchwala,
      name: 'Projekt uchwały — fundusz remontowy',
      category: 'uchwały',
      file_path: 'demo/uchwala_fundusz.pdf',
      file_size: '240 KB',
      is_public: false,
      created_at: iso(now),
      uploaded_by: DEMO_USER_ID,
    },
    {
      id: gid('f', 3),
      name: 'Protokół z zebrania 2025',
      category: 'protokoły',
      file_path: 'demo/protokol_2025.pdf',
      file_size: '310 KB',
      is_public: true,
      created_at: iso(now),
      uploaded_by: DEMO_USER_ID,
    },
    {
      id: gid('f', 4),
      name: 'Sprawozdanie finansowe — skrót',
      category: 'finanse',
      file_path: 'demo/sprawozdanie.pdf',
      file_size: '89 KB',
      is_public: true,
      created_at: iso(now),
      uploaded_by: DEMO_USER_ID,
    },
    {
      id: gid('f', 5),
      name: 'Umowa na utrzymanie czystości',
      category: 'umowy',
      file_path: 'demo/utrzymanie.pdf',
      file_size: '156 KB',
      is_public: false,
      created_at: iso(now),
      uploaded_by: DEMO_USER_ID,
    },
    {
      id: gid('f', 6),
      name: 'Instrukcja głosowania elektronicznego',
      category: 'inne',
      file_path: 'demo/glosowanie.pdf',
      file_size: '64 KB',
      is_public: true,
      created_at: iso(now),
      uploaded_by: DEMO_USER_ID,
    },
  ]

  const charges: DemoCharge[] = []
  let chargeSeq = 1
  for (const apt of aptSpecs) {
    const base = 260 + Math.round(apt.area * 2.4)
    const fr = Math.round(apt.area * 2.0)
    const prev = Math.round(base * 0.9)
    const rows: [string, string, number, string | null, boolean][] = [
      ['2026-03-01', 'eksploatacja', base, null, true],
      ['2026-03-01', 'fundusz_remontowy', fr, null, true],
      ['2026-02-01', 'eksploatacja', prev, 'Naliczenie miesięczne', true],
    ]
    for (const [month, type, amount, desc, auto] of rows) {
      charges.push({
        id: gid('g', chargeSeq++),
        apartment_id: apt.id,
        month,
        type,
        amount,
        description: desc,
        is_auto_generated: auto,
      })
    }
  }

  const payments: DemoPayment[] = []
  let paySeq = 1
  for (const apt of aptSpecs) {
    const baseAmt = 400 + Math.round(apt.area * 2)
    payments.push({
      id: gid('h', paySeq++),
      apartment_id: apt.id,
      amount: baseAmt,
      confirmed_by_admin: true,
      payment_date: '2026-03-01',
      title: 'Przelew — opłaty bieżące',
    })
    payments.push({
      id: gid('h', paySeq++),
      apartment_id: apt.id,
      amount: Math.round(baseAmt * 0.85),
      confirmed_by_admin: apt.number !== '3',
      payment_date: '2026-02-10',
      title: 'Przelew — opłaty luty',
    })
  }

  const resolutions: DemoResolution[] = [
    {
      id: resVoting,
      title: 'Uchwała demonstracyjna — głosowanie w toku',
      description: 'Przykładowa treść uchwały w trybie demo. Załącznik: projekt dokumentu w zakładce Dokumenty.',
      document_id: docUchwala,
      voting_start: '2026-01-01',
      voting_end: '2030-12-31',
      status: 'voting',
      created_at: iso(now),
    },
    {
      id: resClosed,
      title: 'Uchwała zakończona — remont dachu (demo)',
      description: 'Zamknięta uchwała; historia głosów w PDF i w module Uchwały.',
      document_id: docRegulamin,
      voting_start: '2025-06-01',
      voting_end: '2025-12-01',
      status: 'closed',
      created_at: iso(now),
    },
    {
      id: resDraft,
      title: 'Uchwała w przygotowaniu — oświetlenie LED',
      description: 'Szkic do zatwierdzenia na zebraniu; powiązany dokument roboczy.',
      document_id: docUchwala,
      voting_start: null,
      voting_end: null,
      status: 'draft',
      created_at: iso(now),
    },
    {
      id: resDraftFin,
      title: 'Uchwała — zaliczki na media 2026',
      description: 'Szkic finansowy; spójny z kategoriami naliczeń w Lokale.',
      document_id: null,
      voting_start: null,
      voting_end: null,
      status: 'draft',
      created_at: iso(now),
    },
  ]

  const votes: DemoVote[] = []

  const voteId = (n: number) => `v1000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
  let vN = 1
  const votingResidents = [0, 1, 2, 3, 4, 5]
  const votingChoices: ('za' | 'przeciw' | 'wstrzymuje')[] = ['za', 'przeciw', 'za', 'wstrzymuje', 'za', 'za']
  for (let i = 0; i < votingResidents.length; i++) {
    votes.push({
      id: voteId(vN++),
      resolution_id: resVoting,
      resident_id: ownerIds[votingResidents[i]],
      vote: votingChoices[i],
      voted_at: '2026-03-01T10:00:00.000Z',
    })
  }
  votes.push({
    id: voteId(vN++),
    resolution_id: resClosed,
    resident_id: ownerIds[0],
    vote: 'za',
    voted_at: '2025-08-01T12:00:00.000Z',
  })
  votes.push({
    id: voteId(vN++),
    resolution_id: resClosed,
    resident_id: ownerIds[1],
    vote: 'za',
    voted_at: '2025-08-01T12:05:00.000Z',
  })
  votes.push({
    id: voteId(vN++),
    resolution_id: resClosed,
    resident_id: ownerIds[3],
    vote: 'przeciw',
    voted_at: '2025-08-02T09:00:00.000Z',
  })

  const contact_messages: DemoContactMessage[] = [
    {
      id: gid('i', 1),
      name: 'Gość demo',
      email: 'gosc@example.com',
      apartment_number: '1',
      subject: 'Pytanie ogólne',
      message: 'Przykładowa wiadomość z formularza kontaktowego.',
      is_read: false,
      created_at: iso(now),
    },
    {
      id: gid('i', 2),
      name: 'Kamil Nowak',
      email: 'kamil@example.com',
      apartment_number: '5',
      subject: 'Wpis do księgi wieczystej',
      message: 'Prośba o informację o statusie sprawy.',
      is_read: true,
      created_at: iso(now),
    },
    {
      id: gid('i', 3),
      name: 'Skrzynka ogólna',
      email: 'zgloszenia@example.com',
      apartment_number: '12',
      subject: 'Hałas',
      message: 'Zgłoszenie zgodne z lokalem 12 w seedzie.',
      is_read: false,
      created_at: iso(now),
    },
    {
      id: gid('i', 4),
      name: 'Anna Lis',
      email: 'anna.lis@example.com',
      apartment_number: '18',
      subject: 'Parking',
      message: 'Pytanie o przypisanie miejsca parkingowego.',
      is_read: false,
      created_at: iso(now),
    },
    {
      id: gid('i', 5),
      name: 'Serwis',
      email: 'serwis@firma.pl',
      apartment_number: null,
      subject: 'Przegląd wind',
      message: 'Propozycja terminu — spójna z terminem przeglądu technicznego.',
      is_read: true,
      created_at: iso(now),
    },
    {
      id: gid('i', 6),
      name: 'Mieszkaniec demo',
      email: 'mieszkaniec@demo.local',
      apartment_number: '7',
      subject: 'Faktura',
      message: 'Prośba o duplikat faktury za media.',
      is_read: false,
      created_at: iso(now),
    },
    {
      id: gid('i', 7),
      name: 'Gość',
      email: 'gosc2@example.com',
      apartment_number: '24',
      subject: 'Korespondencja',
      message: 'Wiadomość testowa dla lokalu 24.',
      is_read: false,
      created_at: iso(now),
    },
    {
      id: gid('i', 8),
      name: 'Biuro',
      email: 'biuro@example.com',
      apartment_number: '1',
      subject: 'Pytanie o regulamin',
      message: 'Odesłanie do dokumentu Regulamin w zakładce Dokumenty.',
      is_read: true,
      created_at: iso(now),
    },
  ]

  const charge_rates: DemoChargeRate[] = [
    {
      id: gid('j', 1),
      type: 'eksploatacja',
      rate_per_unit: '12.50',
      valid_from: '2026-01-01',
      created_at: iso(now),
    },
    {
      id: gid('j', 2),
      type: 'eksploatacja',
      rate_per_unit: '12.20',
      valid_from: '2025-07-01',
      created_at: iso(now),
    },
    {
      id: gid('j', 3),
      type: 'fundusz_remontowy',
      rate_per_unit: '8.00',
      valid_from: '2026-01-01',
      created_at: iso(now),
    },
    {
      id: gid('j', 4),
      type: 'fundusz_remontowy',
      rate_per_unit: '7.50',
      valid_from: '2025-01-01',
      created_at: iso(now),
    },
    {
      id: gid('j', 5),
      type: 'smieci',
      rate_per_unit: '25.00',
      valid_from: '2026-01-01',
      created_at: iso(now),
    },
    {
      id: gid('j', 6),
      type: 'smieci',
      rate_per_unit: '22.00',
      valid_from: '2025-06-01',
      created_at: iso(now),
    },
  ]

  const audit_log: DemoAuditEntry[] = []
  let auditN = 1
  const auditPush = (table: string, action: string, record_id: string) => {
    audit_log.push({
      id: gid('k', auditN++),
      user_id: DEMO_USER_ID,
      user_name: 'Jan Kowalski (demo)',
      action,
      table_name: table,
      record_id,
      old_data: null,
      new_data: { demo: true },
      created_at: iso(now),
    })
  }
  auditPush('charges', 'create', charges[0].id)
  auditPush('payments', 'create', payments[0].id)
  auditPush('payments', 'create', payments[1].id)
  auditPush('apartments', 'update', aptSpecs[0].id)
  auditPush('resolutions', 'create', resVoting)
  auditPush('votes', 'create', votes[0].id)
  auditPush('charge_rates', 'create', charge_rates[0].id)
  auditPush('documents', 'create', docRegulamin)
  auditPush('announcements', 'create', gid('d', 1))
  auditPush('important_dates', 'create', gid('e', 1))
  auditPush('contact_messages', 'update', gid('i', 1))
  auditPush('billing_groups', 'create', bgSekcja1)
  auditPush('audit_log', 'read', gid('k', 1))
  auditPush('charges', 'create', charges[3]?.id ?? charges[0].id)
  auditPush('payments', 'create', payments[4]?.id ?? payments[0].id)
  auditPush('resolutions', 'update', resDraft)
  auditPush('votes', 'create', votes[1]?.id ?? votes[0].id)
  auditPush('charge_rates', 'update', charge_rates[0].id)
  auditPush('documents', 'update', docUchwala)
  auditPush('announcements', 'update', gid('d', 2))
  auditPush('apartments', 'update', aptSpecs[4].id)
  auditPush('charges', 'create', charges[6]?.id ?? charges[0].id)
  auditPush('payments', 'create', payments[6]?.id ?? payments[0].id)
  auditPush('resolutions', 'create', resClosed)
  auditPush('votes', 'create', votes[6]?.id ?? votes[0].id)
  auditPush('contact_messages', 'create', gid('i', 2))
  auditPush('apartments', 'update', aptSpecs[10].id)

  const chargesExtra: DemoChargesExtra = {
    autoConfig: { enabled: false, day: 15 },
    zawiadomienie: {
      legal_basis: 'Ustawa o wspólnotach mieszkaniowych — podstawa przykładowa (demo).',
    },
  }

  return {
    residents,
    apartments,
    billing_groups,
    announcements,
    important_dates,
    documents,
    charges,
    payments,
    resolutions,
    votes,
    contact_messages,
    charge_rates,
    audit_log,
    chargesExtra,
  }
}

export type DemoStoreSnapshot = ReturnType<typeof seed>

class DemoStore {
  private data: DemoStoreSnapshot

  constructor() {
    this.data = seed()
  }

  reset() {
    this.data = seed()
  }

  get snapshot() {
    return this.data
  }

  get residents() {
    return this.data.residents
  }
  get apartments() {
    return this.data.apartments
  }
  get billing_groups() {
    return this.data.billing_groups
  }
  get announcements() {
    return this.data.announcements
  }
  get important_dates() {
    return this.data.important_dates
  }
  get documents() {
    return this.data.documents
  }
  get charges() {
    return this.data.charges
  }
  get payments() {
    return this.data.payments
  }
  get resolutions() {
    return this.data.resolutions
  }
  get votes() {
    return this.data.votes
  }
  get contact_messages() {
    return this.data.contact_messages
  }
  get charge_rates() {
    return this.data.charge_rates
  }
  get audit_log() {
    return this.data.audit_log
  }
  get chargesExtra() {
    return this.data.chargesExtra
  }

  table(name: string): unknown[] {
    const t = name as keyof DemoStoreSnapshot
    const v = this.data[t]
    if (Array.isArray(v)) return v
    return []
  }
}

export const demoStore = new DemoStore()
