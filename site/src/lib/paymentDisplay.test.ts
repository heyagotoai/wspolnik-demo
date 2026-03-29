import { describe, it, expect } from 'vitest'
import { paymentHistoryDisplay, paymentHistoryBadgeClass } from './paymentDisplay'

describe('paymentHistoryDisplay', () => {
  it('bank import → Wpłata z dnia + Z banku', () => {
    const r = paymentHistoryDisplay('Wpłata z zestawienia bankowego')
    expect(r.primaryLine).toBe('Wpłata z dnia')
    expect(r.badges).toHaveLength(1)
    expect(r.badges[0].kind).toBe('bank')
    expect(r.badges[0].label).toBe('Z banku')
  })

  it('arkusz Excel → Wpłata z dnia + Z arkusza', () => {
    const r = paymentHistoryDisplay('Wpłata z dnia')
    expect(r.primaryLine).toBe('Wpłata z dnia')
    expect(r.badges[0].kind).toBe('spreadsheet')
  })

  it('legacy Import wpłaty → jak arkusz', () => {
    const r = paymentHistoryDisplay('Import wpłaty')
    expect(r.primaryLine).toBe('Wpłata z dnia')
    expect(r.badges[0].kind).toBe('spreadsheet')
  })

  it('rozbicie bez rodzica → tylko Podział', () => {
    const r = paymentHistoryDisplay('Rozbicie wpłaty - lokal 3')
    expect(r.primaryLine).toBe('Wpłata z dnia')
    expect(r.badges).toHaveLength(1)
    expect(r.badges[0].kind).toBe('split')
  })

  it('rozbicie z rodzicem z banku → Podział + Z banku', () => {
    const r = paymentHistoryDisplay('Rozbicie wpłaty - lokal 3', {
      parentTitle: 'Wpłata z zestawienia bankowego',
    })
    expect(r.badges.map(b => b.kind)).toEqual(['split', 'bank'])
    expect(r.badges[1].label).toBe('Z banku')
  })

  it('rozbicie z rodzicem z arkusza → Podział + Z arkusza', () => {
    const r = paymentHistoryDisplay('Rozbicie wpłaty - lokal 3', {
      parentTitle: 'Import zbiorczy',
    })
    expect(r.badges.map(b => b.kind)).toEqual(['split', 'spreadsheet'])
  })

  it('rozbicie z wpłatą grupową → Podział + Grupa', () => {
    const r = paymentHistoryDisplay('Rozbicie wpłaty - lokal 3', {
      parentTitle: 'Wpłata grupowa - Kowalscy',
    })
    expect(r.badges.map(b => b.kind)).toEqual(['split', 'other'])
    expect(r.badges[1].label).toBe('Grupa')
  })

  it('własny tytuł admina — bez znacznika', () => {
    const r = paymentHistoryDisplay('Wpłata gotówką')
    expect(r.primaryLine).toBe('Wpłata gotówką')
    expect(r.badges).toHaveLength(0)
  })

  it('pusty tytuł — Wpłata', () => {
    const r = paymentHistoryDisplay(null)
    expect(r.primaryLine).toBe('Wpłata')
    expect(r.badges).toHaveLength(0)
  })
})

describe('paymentHistoryBadgeClass', () => {
  it('zwraca klasy dla każdego rodzaju', () => {
    expect(paymentHistoryBadgeClass('bank')).toContain('sage')
    expect(paymentHistoryBadgeClass('spreadsheet')).toContain('slate')
    expect(paymentHistoryBadgeClass('split')).toContain('amber')
    expect(paymentHistoryBadgeClass('other')).toContain('violet')
  })
})
