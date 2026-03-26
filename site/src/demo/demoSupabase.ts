/**
 * Mock klienta Supabase (PostgREST + auth + storage) dla trybu demo.
 * Wspiera wzorce używane w site/src — patrz komentarze przy metodach.
 */
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { DEMO_USER_EMAIL, DEMO_USER_ID } from './demoConstants'
import { demoStore } from './demoStore'
import { demoPdfBlob } from './demoApiRouter'

type Filter =
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'gte'; col: string; val: unknown }
  | { kind: 'in'; col: string; vals: unknown[] }
  | { kind: 'not'; col: string; op: string; val: unknown }

function rowMatches(row: Record<string, unknown>, f: Filter): boolean {
  const v = row[f.col]
  if (f.kind === 'eq') return v === f.val
  if (f.kind === 'gte') {
    const a = String(v ?? '')
    const b = String(f.val ?? '')
    return a >= b
  }
  if (f.kind === 'in') return f.vals.includes(v)
  if (f.kind === 'not' && f.op === 'is' && f.val === null) return v != null
  return true
}

function sortRows(
  rows: Record<string, unknown>[],
  orders: { column: string; ascending: boolean }[],
): Record<string, unknown>[] {
  const out = [...rows]
  for (let i = orders.length - 1; i >= 0; i--) {
    const { column, ascending } = orders[i]
    out.sort((a, b) => {
      const av = a[column]
      const bv = b[column]
      if (av === bv) return 0
      const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1
      return ascending ? cmp : -cmp
    })
  }
  return out
}

const DEMO_SESSION: Session = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User,
}

class TableQuery {
  private table: string
  private filters: Filter[] = []
  private orders: { column: string; ascending: boolean }[] = []
  private limitN?: number
  private selectFields?: string
  private headCount = false
  private singleMode: 'none' | 'single' | 'maybe' = 'none'
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private insertPayload?: Record<string, unknown> | Record<string, unknown>[]
  private updatePayload?: Record<string, unknown>

  constructor(table: string) {
    this.table = table
  }

  select(fields?: string, opts?: { count?: string; head?: boolean }) {
    this.selectFields = fields
    if (opts?.count === 'exact' && opts?.head) {
      this.headCount = true
    }
    return this
  }

  eq(col: string, val: unknown) {
    this.filters.push({ kind: 'eq', col, val })
    return this
  }

  gte(col: string, val: unknown) {
    this.filters.push({ kind: 'gte', col, val })
    return this
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ kind: 'in', col, vals })
    return this
  }

  not(col: string, op: string, val: unknown) {
    this.filters.push({ kind: 'not', col, op, val })
    return this
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending !== false })
    return this
  }

  limit(n: number) {
    this.limitN = n
    return this
  }

  single() {
    this.singleMode = 'single'
    return this
  }

  maybeSingle() {
    this.singleMode = 'maybe'
    return this
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = 'insert'
    this.insertPayload = payload
    return this
  }

  update(payload: Record<string, unknown>) {
    this.op = 'update'
    this.updatePayload = payload
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  then<TResult1 = { data: unknown; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute()
      .then(onfulfilled ?? undefined, onrejected ?? undefined) as Promise<TResult1 | TResult2>
  }

  private getRows(): Record<string, unknown>[] {
    const raw = demoStore.table(this.table) as Record<string, unknown>[]
    return raw.map((r) => ({ ...r }))
  }

  private execute(): Promise<{ data: unknown; error: unknown; count?: number }> {
    try {
      if (this.op === 'insert') return this.runInsert()
      if (this.op === 'update') return this.runUpdate()
      if (this.op === 'delete') return this.runDelete()
      return this.runSelect()
    } catch (e) {
      return Promise.resolve({
        data: null,
        error: e instanceof Error ? e : new Error(String(e)),
      })
    }
  }

  private pickFields(row: Record<string, unknown>): Record<string, unknown> {
    if (!this.selectFields || this.selectFields === '*') return row
    const cols = this.selectFields.split(',').map((c) => c.trim())
    const out: Record<string, unknown> = {}
    for (const c of cols) {
      if (c in row) out[c] = row[c]
    }
    return out
  }

  private runSelect(): Promise<{ data: unknown; error: unknown; count?: number }> {
    let rows = this.getRows().filter((row) => this.filters.every((f) => rowMatches(row, f)))

    if (this.headCount) {
      return Promise.resolve({ data: null, error: null, count: rows.length })
    }

    rows = sortRows(rows, this.orders)
    if (this.limitN != null) rows = rows.slice(0, this.limitN)

    const mapped = rows.map((r) => this.pickFields(r))

    if (this.singleMode === 'single') {
      if (mapped.length !== 1) {
        return Promise.resolve({
          data: null,
          error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
        })
      }
      return Promise.resolve({ data: mapped[0], error: null })
    }
    if (this.singleMode === 'maybe') {
      return Promise.resolve({ data: mapped[0] ?? null, error: null })
    }

    return Promise.resolve({ data: mapped, error: null })
  }

  private runInsert(): Promise<{ data: unknown; error: null }> {
    const payload = this.insertPayload
    if (!payload) return Promise.resolve({ data: null, error: null })
    const arr = demoStore.table(this.table) as Record<string, unknown>[]
    const rows = Array.isArray(payload) ? payload : [payload]
    const inserted: Record<string, unknown>[] = []
    const now = new Date().toISOString()
    for (const row of rows) {
      const id = (row.id as string) || crypto.randomUUID()
      const full: Record<string, unknown> = { ...row, id }
      if (this.table === 'announcements' && full.created_at == null) full.created_at = now
      arr.push(full)
      inserted.push(full)
    }
    const data = Array.isArray(this.insertPayload) ? inserted : inserted[0]
    return Promise.resolve({ data, error: null })
  }

  private runUpdate(): Promise<{ data: unknown; error: null }> {
    const payload = this.updatePayload
    if (!payload) return Promise.resolve({ data: null, error: null })
    const arr = demoStore.table(this.table) as Record<string, unknown>[]
    for (let i = 0; i < arr.length; i++) {
      const row = arr[i]
      if (this.filters.every((f) => rowMatches(row, f))) {
        Object.assign(row, payload)
      }
    }
    return Promise.resolve({ data: null, error: null })
  }

  private runDelete(): Promise<{ data: unknown; error: null }> {
    const arr = demoStore.table(this.table) as Record<string, unknown>[]
    for (let i = arr.length - 1; i >= 0; i--) {
      const row = arr[i]
      if (this.filters.every((f) => rowMatches(row, f))) arr.splice(i, 1)
    }
    return Promise.resolve({ data: null, error: null })
  }
}

/** Pliki „w storage” — ścieżka → blob URL (demo). */
const storageFiles = new Map<string, string>()

class StorageBucket {
  private readonly bucketName: string

  constructor(bucket: string) {
    this.bucketName = bucket
  }

  async upload(path: string, file: File | Blob) {
    const url = URL.createObjectURL(file instanceof Blob ? file : new Blob([file]))
    storageFiles.set(`${this.bucketName}/${path}`, url)
    return { data: { path }, error: null }
  }

  async remove(paths: string[]) {
    for (const p of paths) {
      const key = `${this.bucketName}/${p}`
      const u = storageFiles.get(key)
      if (u) URL.revokeObjectURL(u)
      storageFiles.delete(key)
    }
    return { data: null, error: null }
  }

  async createSignedUrl(path: string, _expiresIn: number) {
    const key = `${this.bucketName}/${path}`
    let url = storageFiles.get(key)
    if (!url) {
      url = URL.createObjectURL(demoPdfBlob())
      storageFiles.set(key, url)
    }
    return { data: { signedUrl: url, path }, error: null }
  }

  async list() {
    return { data: [], error: null }
  }
}

class StorageApi {
  from(bucket: string) {
    return new StorageBucket(bucket)
  }
}

export function createDemoSupabaseClient() {
  const authListeners: ((e: AuthChangeEvent, s: Session | null) => void)[] = []

  return {
    auth: {
      async getSession() {
        return { data: { session: DEMO_SESSION }, error: null }
      },
      onAuthStateChange(cb: (e: AuthChangeEvent, s: Session | null) => void) {
        queueMicrotask(() => cb('INITIAL_SESSION', DEMO_SESSION))
        authListeners.push(cb)
        return {
          data: {
            subscription: { unsubscribe: () => {} },
          },
        }
      },
      async signInWithPassword(_creds: { email: string; password: string }) {
        return { data: { user: DEMO_SESSION.user, session: DEMO_SESSION }, error: null }
      },
      async signOut() {
        return { error: null }
      },
    },
    from(table: string) {
      return new TableQuery(table)
    },
    storage: new StorageApi(),
  }
}
