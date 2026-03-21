# ADR-005: UI — Tailwind, polskie lokalizacje, toasty

**Status:** Przyjęty
**Data:** 2026-03-21

## Kontekst
Aplikacja dla polskiej wspólnoty mieszkaniowej — UI musi być po polsku, czytelny i prosty.

## Decyzja
- **Styling:** Tailwind CSS z custom design tokens (sage, charcoal, cream, radius-card, radius-button)
- **Lokalizacja:** Wszystkie daty, etykiety i komunikaty po polsku
- **Feedback:** Toast notifications (nie `alert()`/`confirm()`)
- **Potwierdzenia:** Custom ConfirmProvider dla operacji destrukcyjnych (usuwanie)

## Dlaczego
- Tailwind = szybki prototyping, spójny design
- Toasty zamiast `alert()` = lepszy UX, nie blokuje interakcji
- Polskie formatowanie dat (`toLocaleDateString('pl-PL')`) — naturalne dla użytkowników

## Powiązania
- [[ADR-004-data-access-pattern]] — toasty po operacjach CRUD
