import { DEMO_USER_EMAIL, DEMO_USER_ID } from './demoConstants'
import { demoStore, type DemoResolution, type DemoRole, type DemoVote } from './demoStore'

/** Minimalny, poprawny nagłówek PDF — wystarczy do podglądu w UI (demo). */
export function demoPdfBlob(): Blob {
  return new Blob(
    ['%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF\n'],
    { type: 'application/pdf' },
  )
}

function replaceVotes(next: DemoVote[]) {
  const v = demoStore.votes
  v.splice(0, v.length, ...next)
}

function parsePath(path: string): { pathname: string; search: URLSearchParams } {
  const q = path.indexOf('?')
  if (q === -1) return { pathname: path, search: new URLSearchParams() }
  return {
    pathname: path.slice(0, q),
    search: new URLSearchParams(path.slice(q + 1)),
  }
}

function voteResults(resId: string) {
  const votes = demoStore.votes.filter((v) => v.resolution_id === resId)
  let za = 0
  let przeciw = 0
  let wstrzymuje = 0
  for (const v of votes) {
    if (v.vote === 'za') za++
    else if (v.vote === 'przeciw') przeciw++
    else if (v.vote === 'wstrzymuje') wstrzymuje++
  }
  return {
    za,
    przeciw,
    wstrzymuje,
    total: votes.length,
  }
}

export async function routeDemoApi(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const { pathname, search } = parsePath(path)

  // --- Profile ---
  if (pathname === '/profile' && method === 'GET') {
    const r = demoStore.residents.find((x) => x.id === DEMO_USER_ID)
    return {
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      full_name: r?.full_name ?? 'Demo',
      apartment_number: r?.apartment_number ?? null,
      role: r?.role ?? 'resident',
      is_active: true,
      created_at: r?.created_at ?? new Date().toISOString(),
    }
  }

  if (pathname === '/profile' && method === 'PATCH') {
    const b = body as { full_name?: string }
    const r = demoStore.residents.find((x) => x.id === DEMO_USER_ID)
    if (r && b.full_name) r.full_name = b.full_name
    return routeDemoApi('GET', '/profile')
  }

  if (pathname === '/profile/change-password' && method === 'POST') {
    return { detail: 'Hasło w demo nie jest zmieniane na serwerze.' }
  }

  // --- Resolutions ---
  if (pathname === '/resolutions' && method === 'GET') {
    return demoStore.resolutions.map((x) => ({ ...x }))
  }

  if (pathname === '/resolutions' && method === 'POST') {
    const b = body as Partial<DemoResolution>
    const id = crypto.randomUUID()
    const row: DemoResolution = {
      id,
      title: String(b.title ?? 'Nowa uchwała'),
      description: b.description ?? null,
      document_id: b.document_id ?? null,
      voting_start: b.voting_start ?? null,
      voting_end: b.voting_end ?? null,
      status: b.status ?? 'draft',
      created_at: new Date().toISOString(),
    }
    demoStore.resolutions.push(row)
    return row
  }

  const resMatch = pathname.match(/^\/resolutions\/([^/]+)$/)
  if (resMatch && method === 'PATCH') {
    const id = resMatch[1]
    const r = demoStore.resolutions.find((x) => x.id === id)
    if (!r) throw new Error('Nie znaleziono uchwały')
    const b = body as Partial<DemoResolution>
    if (b.title !== undefined) r.title = b.title
    if (b.description !== undefined) r.description = b.description
    if (b.voting_start !== undefined) r.voting_start = b.voting_start
    if (b.voting_end !== undefined) r.voting_end = b.voting_end
    if (b.status !== undefined) {
      if (b.status === 'draft' && (r.status === 'voting' || r.status === 'closed')) {
        replaceVotes(demoStore.votes.filter((v) => v.resolution_id !== id))
      }
      r.status = b.status
    }
    return { ...r }
  }

  if (resMatch && method === 'DELETE') {
    const id = resMatch[1]
    const ix = demoStore.resolutions.findIndex((x) => x.id === id)
    if (ix === -1) throw new Error('Nie znaleziono uchwały')
    demoStore.resolutions.splice(ix, 1)
    replaceVotes(demoStore.votes.filter((v) => v.resolution_id !== id))
    return { detail: 'Usunięto' }
  }

  const resultsMatch = pathname.match(/^\/resolutions\/([^/]+)\/results$/)
  if (resultsMatch && method === 'GET') {
    return voteResults(resultsMatch[1])
  }

  const myVoteMatch = pathname.match(/^\/resolutions\/([^/]+)\/my-vote$/)
  if (myVoteMatch && method === 'GET') {
    const rid = myVoteMatch[1]
    const v = demoStore.votes.find((x) => x.resolution_id === rid && x.resident_id === DEMO_USER_ID)
    return v ?? null
  }

  const voteMatch = pathname.match(/^\/resolutions\/([^/]+)\/vote$/)
  if (voteMatch && method === 'POST') {
    const rid = voteMatch[1]
    const b = body as { vote?: string }
    const vote = String(b.vote ?? 'wstrzymuje')
    replaceVotes(
      demoStore.votes.filter((x) => !(x.resolution_id === rid && x.resident_id === DEMO_USER_ID)),
    )
    const row: DemoVote = {
      id: crypto.randomUUID(),
      resolution_id: rid,
      resident_id: DEMO_USER_ID,
      vote,
      voted_at: new Date().toISOString(),
    }
    demoStore.votes.push(row)
    return {
      id: row.id,
      vote: row.vote,
      voted_at: row.voted_at,
    }
  }

  const votesListMatch = pathname.match(/^\/resolutions\/([^/]+)\/votes$/)
  if (votesListMatch && method === 'GET') {
    const rid = votesListMatch[1]
    return demoStore.votes
      .filter((v) => v.resolution_id === rid)
      .map((v) => {
        const res = demoStore.residents.find((r) => r.id === v.resident_id)
        return {
          resident_id: v.resident_id,
          full_name: res?.full_name ?? '?',
          apartment_number: res?.apartment_number ?? null,
          vote: v.vote,
          voted_at: v.voted_at,
        }
      })
  }

  const resetVotesMatch = pathname.match(/^\/resolutions\/([^/]+)\/votes$/)
  if (resetVotesMatch && method === 'DELETE') {
    const rid = resetVotesMatch[1]
    replaceVotes(demoStore.votes.filter((v) => v.resolution_id !== rid))
    return { detail: 'Głosy usunięte' }
  }

  // --- Charges ---
  if (pathname === '/charges/rates' && method === 'GET') {
    return demoStore.charge_rates.map((x) => ({ ...x }))
  }

  if (pathname === '/charges/rates' && method === 'POST') {
    const b = body as { type?: string; rate_per_unit?: string; valid_from?: string }
    const row = {
      id: crypto.randomUUID(),
      type: String(b.type ?? 'eksploatacja'),
      rate_per_unit: String(b.rate_per_unit ?? '0'),
      valid_from: String(b.valid_from ?? new Date().toISOString().slice(0, 10)),
      created_at: new Date().toISOString(),
    }
    demoStore.charge_rates.push(row)
    return row
  }

  const delRate = pathname.match(/^\/charges\/rates\/([^/]+)$/)
  if (delRate && method === 'DELETE') {
    const id = delRate[1]
    const ix = demoStore.charge_rates.findIndex((r) => r.id === id)
    if (ix >= 0) demoStore.charge_rates.splice(ix, 1)
    return { detail: 'Usunięto' }
  }

  if (pathname === '/charges/auto-config' && method === 'GET') {
    return { ...demoStore.chargesExtra.autoConfig }
  }

  if (pathname === '/charges/auto-config' && method === 'PATCH') {
    const b = body as { enabled?: boolean; day?: number }
    if (b.enabled !== undefined) demoStore.chargesExtra.autoConfig.enabled = b.enabled
    if (b.day !== undefined) demoStore.chargesExtra.autoConfig.day = b.day
    return { ...demoStore.chargesExtra.autoConfig }
  }

  if (pathname === '/charges/zawiadomienie-config' && method === 'GET') {
    return { legal_basis: demoStore.chargesExtra.zawiadomienie.legal_basis }
  }

  if (pathname === '/charges/zawiadomienie-config' && method === 'PATCH') {
    const b = body as { legal_basis?: string }
    if (b.legal_basis !== undefined) demoStore.chargesExtra.zawiadomienie.legal_basis = b.legal_basis
    return { legal_basis: demoStore.chargesExtra.zawiadomienie.legal_basis }
  }

  if (pathname === '/charges/generate' && method === 'POST') {
    const b = body as { month?: string }
    return {
      month: b.month ?? '2026-03',
      apartments_count: demoStore.apartments.length,
      charges_created: 0,
      total_amount: '0.00',
      warnings: [] as string[],
      regenerated: false,
    }
  }

  const zawPreview = pathname.match(/^\/charges\/charge-notification-preview\/([^/]+)$/)
  if (zawPreview && method === 'GET') {
    return demoPdfBlob()
  }

  const zawOne = pathname.match(/^\/charges\/charge-notification\/([^/]+)$/)
  if (zawOne && method === 'POST') {
    return { detail: 'W demo wiadomość nie jest wysyłana.' }
  }

  if (pathname === '/charges/charge-notification-bulk' && method === 'POST') {
    return { sent: [] as string[], failed: [] as { number: string; error: string }[] }
  }

  const balOne = pathname.match(/^\/charges\/balance-notification\/([^/]+)$/)
  if (balOne && method === 'POST') {
    return { detail: 'W demo e-mail nie jest wysyłany.' }
  }

  if (pathname === '/charges/balance-notification-bulk' && method === 'POST') {
    return { sent: [] as string[], failed: [] as { number: string; error: string }[] }
  }

  // --- Billing groups ---
  const billingGroupsList = () =>
    demoStore.billing_groups.map((g) => ({
      id: g.id,
      name: g.name,
      created_at: g.created_at,
      apartments: demoStore.apartments
        .filter((a) => a.billing_group_id === g.id)
        .map((a) => ({
          id: a.id,
          number: a.number,
          area_m2: a.area_m2 != null ? String(a.area_m2) : null,
          owner_resident_id: a.owner_resident_id,
          owner_name:
            demoStore.residents.find((r) => r.id === a.owner_resident_id)?.full_name ?? null,
          initial_balance: a.initial_balance != null ? String(a.initial_balance) : null,
          billing_group_id: a.billing_group_id,
        })),
    }))

  if (pathname === '/billing-groups' && method === 'GET') {
    return billingGroupsList()
  }

  if (pathname === '/billing-groups' && method === 'POST') {
    const b = body as { name?: string }
    const name = String(b.name ?? '').trim()
    if (!name) throw new Error('Podaj nazwę grupy')
    const row = {
      id: crypto.randomUUID(),
      name,
      created_at: new Date().toISOString(),
    }
    demoStore.billing_groups.push(row)
    return { id: row.id, name: row.name, created_at: row.created_at, apartments: [] }
  }

  const bgBalance = pathname.match(/^\/billing-groups\/([^/]+)\/balance$/)
  if (bgBalance && method === 'GET') {
    const groupId = bgBalance[1]
    const g = demoStore.billing_groups.find((x) => x.id === groupId)
    if (!g) throw new Error('Nie znaleziono grupy')
    const apts = demoStore.apartments.filter((a) => a.billing_group_id === groupId)
    let combined = 0
    const apartments = apts.map((a) => {
      let total_charges = 0
      for (const c of demoStore.charges) {
        if (c.apartment_id === a.id) total_charges += Number(c.amount)
      }
      let total_payments = 0
      for (const p of demoStore.payments) {
        if (p.apartment_id === a.id) total_payments += Number(p.amount)
      }
      const ib = Number(a.initial_balance) || 0
      const balance = ib + total_payments - total_charges
      combined += balance
      return {
        id: a.id,
        number: a.number,
        balance: String(Math.round(balance * 100) / 100),
        total_charges: String(Math.round(total_charges * 100) / 100),
        total_payments: String(Math.round(total_payments * 100) / 100),
        initial_balance: String(ib),
      }
    })
    return {
      group_id: groupId,
      group_name: g.name,
      combined_balance: String(Math.round(combined * 100) / 100),
      apartments,
    }
  }

  const bgSplit = pathname.match(/^\/billing-groups\/([^/]+)\/split-payment$/)
  if (bgSplit && method === 'POST') {
    const groupId = bgSplit[1]
    const g = demoStore.billing_groups.find((x) => x.id === groupId)
    if (!g) throw new Error('Nie znaleziono grupy')
    const b = body as { amount?: string; payment_date?: string; title?: string; split_month?: string }
    const amount = parseFloat(String(b.amount ?? '0'))
    if (!(amount > 0)) throw new Error('Podaj kwotę')
    const apts = demoStore.apartments.filter((a) => a.billing_group_id === groupId)
    if (apts.length === 0) throw new Error('Brak lokali w grupie')
    const payDate = String(b.payment_date ?? '')
    const monthKey = b.split_month
      ? b.split_month.slice(0, 7)
      : payDate.slice(0, 7)
    const monthPrefix = monthKey.length >= 7 ? monthKey : new Date().toISOString().slice(0, 7)
    const chargesByApt: Record<string, number> = {}
    for (const a of apts) chargesByApt[a.id] = 0
    for (const c of demoStore.charges) {
      if (c.month.startsWith(monthPrefix) && chargesByApt[c.apartment_id] != null) {
        chargesByApt[c.apartment_id] += Number(c.amount)
      }
    }
    const sumW = apts.reduce((s, a) => s + (chargesByApt[a.id] || 0), 0)
    const weights = apts.map((a) => (sumW <= 0 ? 1 : chargesByApt[a.id] || 0))
    const wSum = weights.reduce((s, w) => s + w, 0)
    const parent_payment_id = crypto.randomUUID()
    const children: { apartment_id: string; apartment_number: string; amount: string }[] = []
    let allocated = 0
    for (let i = 0; i < apts.length; i++) {
      const a = apts[i]
      let share: number
      if (i === apts.length - 1) {
        share = Math.round((amount - allocated) * 100) / 100
      } else {
        const prop = wSum > 0 ? weights[i] / wSum : 1 / apts.length
        share = Math.round(amount * prop * 100) / 100
      }
      allocated += share
      demoStore.payments.push({
        id: crypto.randomUUID(),
        apartment_id: a.id,
        amount: share,
        confirmed_by_admin: true,
      })
      children.push({
        apartment_id: a.id,
        apartment_number: a.number,
        amount: String(share),
      })
    }
    const split_month = `${monthPrefix}-01`
    return { parent_payment_id, total_amount: String(amount), split_month, children }
  }

  const bgAptDel = pathname.match(/^\/billing-groups\/([^/]+)\/apartments\/([^/]+)$/)
  if (bgAptDel && method === 'DELETE') {
    const [, groupId, aptId] = bgAptDel
    const apt = demoStore.apartments.find((a) => a.id === aptId && a.billing_group_id === groupId)
    if (!apt) throw new Error('Lokal nie należy do tej grupy')
    apt.billing_group_id = null
    return { detail: 'OK' }
  }

  const bgApts = pathname.match(/^\/billing-groups\/([^/]+)\/apartments$/)
  if (bgApts && method === 'POST') {
    const groupId = bgApts[1]
    if (!demoStore.billing_groups.some((x) => x.id === groupId)) throw new Error('Nie znaleziono grupy')
    const b = body as { apartment_ids?: string[] }
    const ids = b.apartment_ids ?? []
    for (const id of ids) {
      const apt = demoStore.apartments.find((a) => a.id === id)
      if (apt) apt.billing_group_id = groupId
    }
    return { detail: 'Przypisano' }
  }

  const bgOne = pathname.match(/^\/billing-groups\/([^/]+)$/)
  if (bgOne && method === 'PATCH') {
    const id = bgOne[1]
    const row = demoStore.billing_groups.find((x) => x.id === id)
    if (!row) throw new Error('Nie znaleziono grupy')
    const b = body as { name?: string }
    if (b.name !== undefined) row.name = String(b.name).trim() || row.name
    return { id: row.id, name: row.name, created_at: row.created_at, apartments: [] }
  }

  if (bgOne && method === 'DELETE') {
    const id = bgOne[1]
    const ix = demoStore.billing_groups.findIndex((x) => x.id === id)
    if (ix === -1) throw new Error('Nie znaleziono grupy')
    demoStore.billing_groups.splice(ix, 1)
    for (const a of demoStore.apartments) {
      if (a.billing_group_id === id) a.billing_group_id = null
    }
    return { detail: 'Usunięto' }
  }

  // --- Residents (API create/delete) ---
  if (pathname === '/residents' && method === 'POST') {
    const b = body as { email?: string; full_name?: string; apartment_number?: string; role?: string }
    const id = crypto.randomUUID()
    demoStore.residents.push({
      id,
      email: String(b.email ?? 'nowy@demo.local'),
      full_name: String(b.full_name ?? 'Nowy mieszkaniec'),
      apartment_number: b.apartment_number?.trim() || null,
      role: (b.role as DemoRole) || 'resident',
      is_active: true,
      created_at: new Date().toISOString(),
    })
    return { detail: 'Utworzono (demo — bez prawdziwego konta auth).' }
  }

  const delResident = pathname.match(/^\/residents\/([^/]+)$/)
  if (delResident && method === 'DELETE') {
    const id = delResident[1]
    if (id === DEMO_USER_ID) throw new Error('Nie można usunąć użytkownika demo.')
    const ix = demoStore.residents.findIndex((r) => r.id === id)
    if (ix >= 0) demoStore.residents.splice(ix, 1)
    return { detail: 'Usunięto' }
  }

  // --- Audit ---
  if (pathname.startsWith('/audit') && method === 'GET') {
    const page = Number(search.get('page') || '1')
    const perPage = Number(search.get('per_page') || '20')
    const data = [...demoStore.audit_log].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const slice = data.slice((page - 1) * perPage, page * perPage)
    return {
      data: slice,
      total: data.length,
      page,
      per_page: perPage,
    }
  }

  // --- Announcements email ---
  const annSend = pathname.match(/^\/announcements\/([^/]+)\/send-email$/)
  if (annSend && method === 'POST') {
    return { detail: 'W demo e-mail nie jest wysyłany.' }
  }

  throw new Error(`Demo API: nieobsługiwane ${method} ${pathname}`)
}

export async function routeDemoBlob(path: string): Promise<Blob> {
  const { pathname } = parsePath(path)
  const zawPreview = pathname.match(/^\/charges\/charge-notification-preview\/([^/]+)$/)
  if (zawPreview) return demoPdfBlob()
  throw new Error(`Demo: brak blob dla ${pathname}`)
}
