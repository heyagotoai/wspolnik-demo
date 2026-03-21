# Ikony (Icons.tsx)

27 niestandardowych komponentów SVG używanych w całej aplikacji.

## Grupy ikon
- **Nawigacja:** ShieldIcon, HandshakeIcon, HomeIcon, MegaphoneIcon, FolderIcon, MailIcon
- **Utility:** MapPinIcon, FileIcon, DownloadIcon, SearchIcon, CalendarIcon, PhoneIcon, ArrowRightIcon
- **Akcje:** LogOutIcon, PlusIcon, EditIcon, TrashIcon, UploadIcon, SettingsIcon, XIcon
- **Admin:** LayoutDashboardIcon, WalletIcon, UsersIcon, UserIcon

## Konwencja
- `fill="none"`, `stroke="currentColor"` — kolor dziedziczy z CSS
- Domyślny rozmiar: `w-5 h-5` (lub `w-8 h-8` dla większych)
- `strokeWidth: 1.5`
- Konfigurowalny `className`

## Powiązania
- [[ADR-008-layout-pattern]] — używane w sidebar nawigacji
- [[ADR-005-ui-lokalizacja]] — część systemu designu
