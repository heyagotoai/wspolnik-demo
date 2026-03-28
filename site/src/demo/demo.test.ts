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
  })
})
