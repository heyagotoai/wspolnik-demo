/**
 * Sortowanie etykiet lokali (np. „3,4A” przed „10”, „29” przed „32”) —
 * nie porządek leksykograficzny po pierwszej cyfrze.
 */
export function compareApartmentLabels(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return (a ?? '').localeCompare(b ?? '', 'pl', { numeric: true })
}
