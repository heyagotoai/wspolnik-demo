# Toast i ConfirmDialog

Komponenty UI do komunikacji z użytkownikiem.

## Toast (powiadomienia)
- Context API + `useToast()` hook
- Typy: success (zielony/sage), error (czerwony), info (ciemny)
- Auto-dismiss po 4 sekundach + ręczne zamknięcie (×)
- Pozycja: prawy dolny róg
- Animacja slide-up

## ConfirmDialog (potwierdzenia)
- Context API + `useConfirm()` hook
- **Promise-based API** — `const ok = await confirm({...})` → zwraca `true`/`false`
- Tryb "danger" — czerwony przycisk dla operacji destrukcyjnych (usuwanie)
- Kliknięcie poza dialog = anulowanie
- Animacja scale-in

## Dlaczego nie alert()/confirm()
- Natywne dialogi blokują cały UI
- Nie da się ich stylować
- Wyglądają inaczej w każdej przeglądarce

## Powiązania
- [[ADR-005-ui-lokalizacja]] — zasada: zawsze toast, nigdy alert()
- [[ADR-008-layout-pattern]] — ToastProvider i ConfirmProvider w App.tsx owijają całą aplikację
