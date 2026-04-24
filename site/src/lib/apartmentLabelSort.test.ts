import { describe, expect, it } from 'vitest'
import { compareApartmentLabels } from './apartmentLabelSort'

describe('compareApartmentLabels', () => {
  it('sortuje numerycznie pierwszy segment (3 przed 10, 10 przed 29)', () => {
    const labels = ['10', '3,4A', '29', '3', '32, 45 (2 lokale)']
    const sorted = [...labels].sort(compareApartmentLabels)
    expect(sorted).toEqual(['3', '3,4A', '10', '29', '32, 45 (2 lokale)'])
  })

  it('traktuje null/undefined jak pusty string', () => {
    expect(compareApartmentLabels(null, '1')).toBeLessThan(0)
    expect(compareApartmentLabels('1', undefined)).toBeGreaterThan(0)
    expect(compareApartmentLabels(null, null)).toBe(0)
  })
})
