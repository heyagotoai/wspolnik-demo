import { communityInfo } from '../data/mockData'
import { isDemoApp } from './isDemoApp'

/** Logo w nagłówku / logowaniu / PDF — w demo wygenerowany asset. */
export function logoSrc(): string {
  return isDemoApp() ? '/demo-logo.png' : '/logo.png'
}

/** Tekst alternatywny logo — ze `communityInfo.shortName`. */
export function logoAlt(): string {
  return communityInfo.shortName
}

/** Zdjęcie hero na stronie głównej — w demo wygenerowany asset. */
export function heroBuildingSrc(): string {
  return isDemoApp() ? '/demo-hero.png' : '/gabi-budynek.png'
}

export function heroBuildingAlt(): string {
  return isDemoApp()
    ? 'Ilustracja budynku — wersja demonstracyjna'
    : `Budynek — ${communityInfo.name}`
}
