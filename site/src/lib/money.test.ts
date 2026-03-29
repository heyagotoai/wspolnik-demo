import { describe, expect, it } from 'vitest'
import { roundMoney2 } from './money'

describe('roundMoney2', () => {
  it('usuwa mikro-ujemność przy saldzie teoretycznie zerowym', () => {
    const fp = 0.1 + 0.2 - 0.3
    expect(fp).not.toBe(0)
    expect(roundMoney2(fp)).toBe(0)
    expect(`${roundMoney2(fp).toFixed(2)} zł`).toBe('0.00 zł')
  })

  it('zachowuje sensowne kwoty ujemne', () => {
    expect(roundMoney2(-12.34)).toBe(-12.34)
  })
})
