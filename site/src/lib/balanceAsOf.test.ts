import { describe, it, expect } from 'vitest'
import { computeBalanceAsOf, formatBalanceAsOfDate } from './balanceAsOf'

describe('computeBalanceAsOf', () => {
  it('zwraca null gdy brak wpłat i importów', () => {
    expect(
      computeBalanceAsOf({ paymentDates: [], lastBankImportAt: null, lastExcelImportAt: null })
    ).toBeNull()
  })

  it('ignoruje niezaksięgowane wpłaty', () => {
    expect(
      computeBalanceAsOf({
        paymentDates: [
          { payment_date: '2026-04-15', confirmed_by_admin: false },
          { payment_date: '2026-04-10', confirmed_by_admin: true },
        ],
        lastBankImportAt: null,
        lastExcelImportAt: null,
      })
    ).toBe('2026-04-10')
  })

  it('wybiera najpóźniejszą z: wpłat, importu bankowego, importu xlsx', () => {
    expect(
      computeBalanceAsOf({
        paymentDates: [{ payment_date: '2026-04-10', confirmed_by_admin: true }],
        lastBankImportAt: '2026-04-16T20:41:00+00:00',
        lastExcelImportAt: '2026-03-28T17:37:00+00:00',
      })
    ).toBe('2026-04-16')
  })

  it('gdy wpłata późniejsza od importów — zwraca datę wpłaty', () => {
    expect(
      computeBalanceAsOf({
        paymentDates: [{ payment_date: '2026-04-18', confirmed_by_admin: true }],
        lastBankImportAt: '2026-04-16T20:41:00+00:00',
        lastExcelImportAt: null,
      })
    ).toBe('2026-04-18')
  })

  it('działa też bez wpłat (tylko globalny import)', () => {
    expect(
      computeBalanceAsOf({
        paymentDates: [],
        lastBankImportAt: '2026-04-16T20:41:00+00:00',
        lastExcelImportAt: null,
      })
    ).toBe('2026-04-16')
  })
})

describe('formatBalanceAsOfDate', () => {
  it('konwertuje YYYY-MM-DD → DD-MM-YYYY', () => {
    expect(formatBalanceAsOfDate('2026-04-20')).toBe('20-04-2026')
  })
})
