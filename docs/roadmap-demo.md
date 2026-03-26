# Roadmap: demo produktu (wspolnik-demo)

## Podział repozytoriów

| Repo | Rola |
|------|------|
| **gabi-site** | Wdrożenie dla **konkretnego klienta** (WM GABI). Kod demo zwykle nie commituje się do gabi-site. |
| **wspolnik-demo** (to repo) | Pełna aplikacja frontend + warstwa demo (`site/src/demo/`, mocki API/Supabase, `VITE_PUBLIC_DEMO_ROUTES`). |

Synchronizacja produktu: **z gabi_site → do wspolnik-demo** (`upstream` + merge). Nie zakładamy, że całość wspolnik-demo wraca do gabi_site.

## Etapy

### 1. Repo GitHub + implementacja w **wspolnik-demo**

- [x] Repo **wspolnik-demo** na GitHubie (`heyagotoai/wspolnik-demo`).
- [x] Warstwa demo: `site/src/demo/`, mocki API/Supabase, trasy `/demo/*`, testy Vitest.
- [x] Zmienne: `VITE_PUBLIC_DEMO_ROUTES` / `VITE_DEMO_ONLY` / brak Supabase — opis w `site/.env.example`.
- [ ] Vercel: deploy produkcyjny — patrz `docs/operations/demo-wdrozenie-wspolnik.md`.

### 2. gabi-site — bez zmian pod demo (domyślnie)

- W gabi-site zwykle brak `site/src/demo/`; wersja demonstracyjna: repo **wspolnik-demo**.

### 3. Aktualizacja demo po zmianach w produkcie (klient)

```bash
cd D:\_AI\wspolnik-demo
git fetch upstream
git merge upstream/main
cd site && npm test && npm run build
```

Rozwiązywanie konfliktów: często `site/` wspólny z gabi_site + pliki tylko w `site/src/demo/`.

## Status

**2026-03-26** — implementacja warstwy demo w repo wspolnik-demo (mocki, dane fikcyjne, assety). Wdrożenie na Vercel: instrukcja w `docs/operations/demo-wdrozenie-wspolnik.md`.
