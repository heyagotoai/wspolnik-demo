/**
 * Wyświetlanie wpłat: ujednolicony tytuł + znaczniki źródła.
 * Dla „Rozbicie wpłaty…” przekaż parentTitle (tytuł wpłaty nadrzędnej), żeby pokazać Z banku / Z arkusza.
 */
export type PaymentHistoryBadge =
  | { kind: 'bank'; label: string; hint: string }
  | { kind: 'spreadsheet'; label: string; hint: string }
  | { kind: 'split'; label: string; hint: string }
  | { kind: 'other'; label: string; hint: string }

const HINT_BANK = 'Import z zestawienia bankowego (.xls)'
const HINT_SHEET = 'Import z arkusza Excel (Dopasowania)'

const BADGE_BANK: PaymentHistoryBadge = {
  kind: 'bank',
  label: 'Z banku',
  hint: HINT_BANK,
}

const BADGE_SHEET: PaymentHistoryBadge = {
  kind: 'spreadsheet',
  label: 'Z arkusza',
  hint: HINT_SHEET,
}

const BADGE_SPLIT: PaymentHistoryBadge = {
  kind: 'split',
  label: 'Podział',
  hint: 'Udział w wpłacie rozłożonej na lokale',
}

function badgesForSplitParent(parentTitle: string | null | undefined): PaymentHistoryBadge[] {
  const pt = parentTitle?.trim()
  if (!pt) {
    return [BADGE_SPLIT]
  }
  if (pt === 'Wpłata z zestawienia bankowego') {
    return [BADGE_SPLIT, BADGE_BANK]
  }
  if (pt === 'Import zbiorczy' || pt === 'Wpłata z dnia' || pt === 'Import wpłaty') {
    return [BADGE_SPLIT, BADGE_SHEET]
  }
  return [
    BADGE_SPLIT,
    {
      kind: 'other',
      label: 'Grupa',
      hint: 'Wpłata grupowa lub ręczna — szczegóły w panelu zarządu',
    },
  ]
}

export function paymentHistoryDisplay(
  title: string | null,
  options?: { parentTitle?: string | null },
): {
  primaryLine: string
  badges: PaymentHistoryBadge[]
} {
  const t = (title ?? '').trim()

  if (t === 'Wpłata z zestawienia bankowego') {
    return { primaryLine: 'Wpłata z dnia', badges: [BADGE_BANK] }
  }

  if (t === 'Wpłata z dnia' || t === 'Import wpłaty') {
    return { primaryLine: 'Wpłata z dnia', badges: [BADGE_SHEET] }
  }

  if (t === 'Import zbiorczy') {
    return {
      primaryLine: 'Wpłata z dnia',
      badges: [
        {
          kind: 'spreadsheet',
          label: 'Z arkusza',
          hint: 'Import zbiorczy z arkusza',
        },
      ],
    }
  }

  if (t.startsWith('Rozbicie wpłaty')) {
    return {
      primaryLine: 'Wpłata z dnia',
      badges: badgesForSplitParent(options?.parentTitle),
    }
  }

  return {
    primaryLine: t || 'Wpłata',
    badges: [],
  }
}

export function paymentHistoryBadgeClass(kind: PaymentHistoryBadge['kind']): string {
  switch (kind) {
    case 'bank':
      return 'border-sage/35 bg-sage-pale/50 text-sage'
    case 'spreadsheet':
      return 'border-slate-200 bg-slate-50 text-slate-600'
    case 'split':
      return 'border-amber-200/90 bg-amber-50 text-amber-900'
    case 'other':
      return 'border-violet-200/90 bg-violet-50 text-violet-900'
    default:
      return 'border-cream-medium bg-white text-charcoal'
  }
}
