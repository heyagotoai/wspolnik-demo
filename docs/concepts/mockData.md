# mockData.ts — Dane konfiguracyjne i testowe

Centralny plik z danymi statycznymi używanymi na stronie publicznej.

## Co zawiera
| Export | Opis | Gdzie używane |
|--------|------|---------------|
| `communityInfo` | Nazwa, adres, email wspólnoty | Header, Footer, ContactPage |
| `navLinks` | 5 linków nawigacji publicznej | Header, Footer |
| `announcements` | 5 przykładowych ogłoszeń | HomePage (karuzela) |
| `importantDates` | 4 nadchodzące daty | NewsPage (sidebar) |
| `documents` | 8 przykładowych dokumentów | DocumentsPage (publiczny) |
| `documentCategories` | 6 kategorii dokumentów | DocumentsPage (filtry) |
| `emergencyContacts` | Numery alarmowe (112, 997, 998, 999) | ContactPage |
| `communityValues` | 3 wartości wspólnoty | AboutPage |
| `contactSubjects` | 4 tematy formularza kontaktowego | ContactPage |

## Uwaga
- Ogłoszenia i daty w panelu mieszkańca/admina pobierane są z **bazy Supabase**, nie z mockData
- mockData służy tylko stronie publicznej i layoutowi
- W przyszłości `communityInfo` może trafić do bazy (edytowalne z panelu admina)

## Powiązania
- [[ADR-008-layout-pattern]] — Header/Footer czytają z mockData
- [[Supabase]] — panel mieszkańca/admina korzysta z bazy, nie z mocków
