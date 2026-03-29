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

function seed() {
  const now = new Date()
  const aptId = 'b1000000-0000-4000-8000-000000000001'
  const apt5 = 'b2000000-0000-4000-8000-000000000002'
  const apt3 = 'b3000000-0000-4000-8000-000000000003'
  const apt18 = 'b4000000-0000-4000-8000-000000000004'
  const apt24 = 'b5000000-0000-4000-8000-000000000005'
  const resVoting = 'c1000000-0000-4000-8000-000000000001'
  const resClosed = 'c1000000-0000-4000-8000-000000000002'
  const bgSekcja1 = 'l1000000-0000-4000-8000-000000000001'
  const bgSekcja2 = 'l1000000-0000-4000-8000-000000000002'

  const residents: DemoResident[] = [
    {
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      full_name: 'Jan Kowalski (demo)',
      apartment_number: '12',
      role: 'resident',
      is_active: true,
      created_at: iso(now),
    },
    {
      id: 'a2000000-0000-4000-8000-000000000002',
      email: 'drugi.demo@wspolnik-demo.local',
      full_name: 'Anna Nowak (demo)',
      apartment_number: '5',
      role: 'resident',
      is_active: true,
      created_at: iso(now),
    },
    {
      id: 'a3000000-0000-4000-8000-000000000003',
      email: 'trzeci.demo@wspolnik-demo.local',
      full_name: 'Piotr Wiśniewski (demo)',
      apartment_number: '3',
      role: 'resident',
      is_active: true,
      created_at: iso(now),
    },
    {
      id: 'a4000000-0000-4000-8000-000000000004',
      email: 'czwarty.demo@wspolnik-demo.local',
      full_name: 'Maria Zielińska (demo)',
      apartment_number: '18',
      role: 'resident',
      is_active: true,
      created_at: iso(now),
    },
    {
      id: 'a5000000-0000-4000-8000-000000000005',
      email: 'piaty.demo@wspolnik-demo.local',
      full_name: 'Tomasz Lewandowski (demo)',
      apartment_number: '24',
      role: 'resident',
      is_active: true,
      created_at: iso(now),
    },
  ]

  const billing_groups: DemoBillingGroupRow[] = [
    { id: bgSekcja1, name: 'Sekcja I (demo)', created_at: iso(now) },
    { id: bgSekcja2, name: 'Sekcja II (demo)', created_at: iso(now) },
  ]

  const apartments: DemoApartment[] = [
    {
      id: aptId,
      number: '12',
      area_m2: 65,
      share: 0.045,
      declared_occupants: 3,
      initial_balance: 120.5,
      initial_balance_date: '2025-01-01',
      owner_resident_id: DEMO_USER_ID,
      billing_group_id: bgSekcja1,
    },
    {
      id: apt5,
      number: '5',
      area_m2: 48,
      share: 0.032,
      declared_occupants: 2,
      initial_balance: 0,
      initial_balance_date: '2025-01-01',
      owner_resident_id: 'a2000000-0000-4000-8000-000000000002',
      billing_group_id: bgSekcja1,
    },
    {
      id: apt3,
      number: '3',
      area_m2: 42,
      share: 0.028,
      declared_occupants: 2,
      initial_balance: -45.2,
      initial_balance_date: '2025-01-01',
      owner_resident_id: 'a3000000-0000-4000-8000-000000000003',
      billing_group_id: bgSekcja1,
    },
    {
      id: apt18,
      number: '18',
      area_m2: 72,
      share: 0.052,
      declared_occupants: 4,
      initial_balance: 340,
      initial_balance_date: '2025-01-01',
      owner_resident_id: 'a4000000-0000-4000-8000-000000000004',
      billing_group_id: bgSekcja2,
    },
    {
      id: apt24,
      number: '24',
      area_m2: 58,
      share: 0.041,
      declared_occupants: 3,
      initial_balance: 15.75,
      initial_balance_date: '2025-01-01',
      owner_resident_id: 'a5000000-0000-4000-8000-000000000005',
      billing_group_id: bgSekcja2,
    },
  ]

  const announcements: DemoAnnouncement[] = [
    {
      id: 'd1000000-0000-4000-8000-000000000001',
      title: 'Zebranie — tryb demonstracyjny',
      content: 'To jest przykładowe ogłoszenie w wersji demo. Dane nie są zapisywane na serwerze.',
      excerpt: 'Przykładowe ogłoszenie w demo.',
      is_pinned: true,
      email_sent_at: null,
      created_at: iso(now),
      author_id: DEMO_USER_ID,
    },
    {
      id: 'd1000000-0000-4000-8000-000000000002',
      title: 'Harmonogram prac',
      content: 'Kolejne informacje pojawią się tutaj po wdrożeniu u klienta.',
      excerpt: 'Informacja demonstracyjna.',
      is_pinned: false,
      email_sent_at: null,
      created_at: iso(now),
      author_id: DEMO_USER_ID,
    },
  ]

  const important_dates: DemoImportantDate[] = [
    {
      id: 'e1000000-0000-4000-8000-000000000001',
      title: 'Zbiórka na fundusz remontowy',
      date: '2026-12-31',
      description: 'Przypomnienie — termin w wersji demo.',
    },
  ]

  const documents: DemoDocument[] = [
    {
      id: 'f1000000-0000-4000-8000-000000000001',
      name: 'Regulamin demo',
      category: 'regulamin',
      file_path: 'demo/regulamin.pdf',
      file_size: '120 KB',
      is_public: true,
      created_at: iso(now),
      uploaded_by: DEMO_USER_ID,
    },
  ]

  const charges: DemoCharge[] = [
    {
      id: 'g1000000-0000-4000-8000-000000000001',
      apartment_id: aptId,
      month: '2026-03-01',
      type: 'eksploatacja',
      amount: 450,
      description: null,
      is_auto_generated: false,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000002',
      apartment_id: aptId,
      month: '2026-03-01',
      type: 'fundusz_remontowy',
      amount: 520,
      description: null,
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000003',
      apartment_id: aptId,
      month: '2026-02-01',
      type: 'eksploatacja',
      amount: 445,
      description: 'Luty — naliczenie miesięczne',
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000004',
      apartment_id: apt5,
      month: '2026-03-01',
      type: 'eksploatacja',
      amount: 384,
      description: null,
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000005',
      apartment_id: apt5,
      month: '2026-03-01',
      type: 'smieci',
      amount: 50,
      description: null,
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000006',
      apartment_id: apt5,
      month: '2026-02-01',
      type: 'eksploatacja',
      amount: 380,
      description: null,
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000007',
      apartment_id: apt3,
      month: '2026-03-01',
      type: 'eksploatacja',
      amount: 290,
      description: null,
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000008',
      apartment_id: apt3,
      month: '2026-03-01',
      type: 'fundusz_remontowy',
      amount: 336,
      description: null,
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000009',
      apartment_id: apt18,
      month: '2026-03-01',
      type: 'eksploatacja',
      amount: 498,
      description: null,
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000010',
      apartment_id: apt18,
      month: '2026-03-01',
      type: 'smieci',
      amount: 100,
      description: '4 osoby zadeklarowane',
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000011',
      apartment_id: apt18,
      month: '2026-02-01',
      type: 'inne',
      amount: 120,
      description: 'Rozliczenie mediów — korekta',
      is_auto_generated: false,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000012',
      apartment_id: apt24,
      month: '2026-03-01',
      type: 'eksploatacja',
      amount: 401,
      description: null,
      is_auto_generated: true,
    },
    {
      id: 'g1000000-0000-4000-8000-000000000013',
      apartment_id: apt24,
      month: '2026-03-01',
      type: 'fundusz_remontowy',
      amount: 464,
      description: null,
      is_auto_generated: true,
    },
  ]

  const payments: DemoPayment[] = [
    {
      id: 'h1000000-0000-4000-8000-000000000001',
      apartment_id: aptId,
      amount: 500,
      confirmed_by_admin: true,
    },
    {
      id: 'h1000000-0000-4000-8000-000000000002',
      apartment_id: aptId,
      amount: 450,
      confirmed_by_admin: true,
    },
    {
      id: 'h1000000-0000-4000-8000-000000000003',
      apartment_id: apt5,
      amount: 434,
      confirmed_by_admin: true,
    },
    {
      id: 'h1000000-0000-4000-8000-000000000004',
      apartment_id: apt3,
      amount: 300,
      confirmed_by_admin: false,
    },
    {
      id: 'h1000000-0000-4000-8000-000000000005',
      apartment_id: apt18,
      amount: 650,
      confirmed_by_admin: true,
    },
    {
      id: 'h1000000-0000-4000-8000-000000000006',
      apartment_id: apt24,
      amount: 420,
      confirmed_by_admin: true,
    },
  ]

  const resolutions: DemoResolution[] = [
    {
      id: resVoting,
      title: 'Uchwała demonstracyjna — głosowanie',
      description: 'Przykładowa treść uchwały w trybie demo.',
      document_id: null,
      voting_start: '2026-01-01',
      voting_end: '2030-12-31',
      status: 'voting',
      created_at: iso(now),
    },
    {
      id: resClosed,
      title: 'Uchwała zakończona (demo)',
      description: 'Zamknięta uchwała do podglądu.',
      document_id: null,
      voting_start: '2025-06-01',
      voting_end: '2025-12-01',
      status: 'closed',
      created_at: iso(now),
    },
  ]

  const votes: DemoVote[] = []

  const contact_messages: DemoContactMessage[] = [
    {
      id: 'i1000000-0000-4000-8000-000000000001',
      name: 'Gość demo',
      email: 'gosc@example.com',
      apartment_number: '1',
      subject: 'Pytanie ogólne',
      message: 'Przykładowa wiadomość z seedu (demo).',
      is_read: false,
      created_at: iso(now),
    },
  ]

  const charge_rates: DemoChargeRate[] = [
    {
      id: 'j1000000-0000-4000-8000-000000000001',
      type: 'eksploatacja',
      rate_per_unit: '12.50',
      valid_from: '2026-01-01',
      created_at: iso(now),
    },
    {
      id: 'j1000000-0000-4000-8000-000000000002',
      type: 'eksploatacja',
      rate_per_unit: '12.20',
      valid_from: '2025-07-01',
      created_at: iso(now),
    },
    {
      id: 'j1000000-0000-4000-8000-000000000003',
      type: 'fundusz_remontowy',
      rate_per_unit: '8.00',
      valid_from: '2026-01-01',
      created_at: iso(now),
    },
    {
      id: 'j1000000-0000-4000-8000-000000000004',
      type: 'fundusz_remontowy',
      rate_per_unit: '7.50',
      valid_from: '2025-01-01',
      created_at: iso(now),
    },
    {
      id: 'j1000000-0000-4000-8000-000000000005',
      type: 'smieci',
      rate_per_unit: '25.00',
      valid_from: '2026-01-01',
      created_at: iso(now),
    },
    {
      id: 'j1000000-0000-4000-8000-000000000006',
      type: 'smieci',
      rate_per_unit: '22.00',
      valid_from: '2025-06-01',
      created_at: iso(now),
    },
  ]

  const audit_log: DemoAuditEntry[] = [
    {
      id: 'k1000000-0000-4000-8000-000000000001',
      user_id: DEMO_USER_ID,
      user_name: 'Jan Kowalski (demo)',
      action: 'create',
      table_name: 'charges',
      record_id: 'g1000000-0000-4000-8000-000000000001',
      old_data: null,
      new_data: { amount: 450 },
      created_at: iso(now),
    },
  ]

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
