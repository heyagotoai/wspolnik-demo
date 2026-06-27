import { describe, it, expect, beforeEach } from 'vitest'
import { isDemoAppFromPath } from './isDemoApp'
import { demoStore } from './demoStore'
import { routeDemoApi } from './demoApiRouter'
import { DEMO_USER_EMAIL, DEMO_USER_ID } from './demoConstants'

describe('isDemoAppFromPath', () => {
  it('wykrywa /demo i podścieżki', () => {
    expect(isDemoAppFromPath('/demo')).toBe(true)
    expect(isDemoAppFromPath('/demo/panel')).toBe(true)
    expect(isDemoAppFromPath('/')).toBe(false)
    expect(isDemoAppFromPath('/panel')).toBe(false)
  })
})

describe('demoApiRouter', () => {
  beforeEach(() => {
    demoStore.reset()
  })

  it('GET /profile zwraca profil demo', async () => {
    const p = (await routeDemoApi('GET', '/profile')) as { id: string; email: string }
    expect(p.id).toBe(DEMO_USER_ID)
    expect(p.email).toBe(DEMO_USER_EMAIL)
  })

  it('GET /resolutions zwraca listę', async () => {
    const list = (await routeDemoApi('GET', '/resolutions')) as { id: string }[]
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
  })

  it('GET /billing-groups zwraca listę (grupy rozliczeniowe)', async () => {
    const list = (await routeDemoApi('GET', '/billing-groups')) as unknown[]
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThanOrEqual(2)
  })

  it('POST /payments dodaje wpłatę ręczną do lokalu', async () => {
    const apt = demoStore.apartments[0]
    const before = demoStore.payments.length
    const res = (await routeDemoApi('POST', '/payments', {
      apartment_id: apt.id,
      amount: '123.45',
      payment_date: '2026-01-15',
      title: 'Korekta',
    })) as { id: string }
    expect(res.id).toBeTruthy()
    expect(demoStore.payments.length).toBe(before + 1)
    const added = demoStore.payments.find((p) => p.id === res.id)
    expect(added?.apartment_id).toBe(apt.id)
    expect(added?.amount).toBe(123.45)
    expect(added?.confirmed_by_admin).toBe(true)
  })

  it('PATCH /payments/:id przenosi wpłatę do innego lokalu', async () => {
    const apt = demoStore.apartments[0]
    const other = demoStore.apartments[1]
    const created = (await routeDemoApi('POST', '/payments', {
      apartment_id: apt.id,
      amount: '50.00',
      payment_date: '2026-02-01',
      title: 'Gotówka',
    })) as { id: string }
    await routeDemoApi('PATCH', `/payments/${created.id}`, {
      amount: '60.00',
      payment_date: '2026-02-02',
      title: 'Gotówka (korekta)',
      apartment_id: other.id,
    })
    const moved = demoStore.payments.find((p) => p.id === created.id)
    expect(moved?.apartment_id).toBe(other.id)
    expect(moved?.amount).toBe(60)
  })

  it('DELETE /payments/:id usuwa wpłatę', async () => {
    const apt = demoStore.apartments[0]
    const created = (await routeDemoApi('POST', '/payments', {
      apartment_id: apt.id,
      amount: '10.00',
      payment_date: '2026-03-01',
      title: null,
    })) as { id: string }
    await routeDemoApi('DELETE', `/payments/${created.id}`)
    expect(demoStore.payments.some((p) => p.id === created.id)).toBe(false)
  })

  it('PATCH /residents/:id/email zmienia adres email', async () => {
    const r = demoStore.residents.find((x) => x.id !== DEMO_USER_ID)!
    await routeDemoApi('PATCH', `/residents/${r.id}/email`, { email: 'Nowy@Demo.PL' })
    const updated = demoStore.residents.find((x) => x.id === r.id)
    expect(updated?.email).toBe('nowy@demo.pl')
  })

  it('POST /residents/:id/reset-password zwraca nowe hasło', async () => {
    const r = demoStore.residents.find((x) => x.id !== DEMO_USER_ID)!
    const res = (await routeDemoApi('POST', `/residents/${r.id}/reset-password`, {})) as {
      password: string
    }
    expect(res.password).toHaveLength(12)
  })

  it('DELETE/POST /residents/:id/apartments odpina i ponownie przypisuje lokal', async () => {
    const owned = demoStore.apartments.find((a) => a.owner_resident_id)!
    const originalOwner = owned.owner_resident_id!

    // odpięcie od obecnego właściciela → lokal staje się wolny
    await routeDemoApi('DELETE', `/residents/${originalOwner}/apartments/${owned.id}`)
    expect(demoStore.apartments.find((a) => a.id === owned.id)?.owner_resident_id).toBeNull()

    // ponowne przypisanie do innego mieszkańca
    const other = demoStore.residents.find(
      (x) => x.id !== DEMO_USER_ID && x.id !== originalOwner,
    )!
    await routeDemoApi('POST', `/residents/${other.id}/apartments`, { apartment_id: owned.id })
    expect(demoStore.apartments.find((a) => a.id === owned.id)?.owner_resident_id).toBe(other.id)
  })

  it('POST /residents/:id/apartments odrzuca lokal z innym właścicielem', async () => {
    const resident = demoStore.residents.find((x) => x.id !== DEMO_USER_ID)!
    const taken = demoStore.apartments.find(
      (a) => a.owner_resident_id && a.owner_resident_id !== resident.id,
    )!
    await expect(
      routeDemoApi('POST', `/residents/${resident.id}/apartments`, { apartment_id: taken.id }),
    ).rejects.toThrow(/już przypisanego właściciela/)
  })
})
