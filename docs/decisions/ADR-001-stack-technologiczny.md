# ADR-001: Stack Technologiczny

**Status:** Przyjęty
**Data:** 2026-03-15

## Kontekst
Projekt WM Gabi to system zarządzania wspólnotą mieszkaniową. Potrzebujemy stacku, który:
- Jest przyjazny dla osoby uczącej się (Python/FastAPI background)
- Zapewnia bezpieczeństwo danych mieszkańców (RODO)
- Minimalizuje koszty hostingu

## Decyzja
- **Frontend:** React (Vite) — na [[Vercel]]
- **Backend:** [[FastAPI]] (Python) — logika biznesowa, integracje
- **Baza danych:** [[Supabase]] (PostgreSQL + Auth + RLS)
- **Automatyzacje:** n8n (przyszłość)
- **Odrzucone:** LangChain (niepotrzebna złożoność)

## Dlaczego
- Supabase daje auth + RLS "z pudełka" — nie piszemy własnego systemu uprawnień
- FastAPI to naturalny wybór przy doświadczeniu w Pythonie
- React + Vite = szybki dev, duży ekosystem komponentów
- Vercel = darmowy hosting dla frontendu

## Edge cases
- Supabase ma limity na darmowym planie (500MB storage, 50k MAU)
- Jeśli projekt urośnie, może być potrzeba migracji na self-hosted Supabase
