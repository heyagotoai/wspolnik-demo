# Wdrożenie demo — repozytorium wspolnik-demo

Frontend (Vite/React) z **pełnymi mockami** w pamięci — bez obowiązkowego Supabase ani FastAPI. Produkcja klienta (WM GABI) = repo **gabi-site**; ten dokument dotyczy wyłącznie **wspolnik-demo**.

## Vercel

1. Import repozytorium z GitHuba → **Root Directory:** katalog główny repo (używany jest rootowy `vercel.json`: `installCommand` `cd site && npm ci`, build `cd site && npm run build`, output `site/dist`). Build używa lokalnego `tsc` i `vite` z `dependencies` w `site/package.json` (bez `npx tsc`, żeby nie pobierać błędnego pakietu `tsc` z rejestru npm).
2. **Environment Variables (Production):**
   - `VITE_PUBLIC_DEMO_ROUTES` = `true` — cała aplikacja w mockach (API, Supabase, kontakt).
   - Opcjonalnie: **nie ustawiaj** `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` albo zostaw puste — `isDemoApp()` i tak wymusi mocki.
3. Deploy: `npx vercel` / `npx vercel --prod` (wymaga zalogowania: `npx vercel login`) albo push na podpiętą gałąź z GitHuba.

## Uwagi

- **Backend `/api` na Vercel:** pełny projekt WM Gabi ma `api/` jako serverless; w samym demo frontend działa bez wywołań prawdziwego API dzięki `demoApiRouter`. Jeśli deployujesz **tylko** statyczny frontend demo, upewnij się, że żądania do `/api` nie są wymagane (w mockach wszystko jest obsłużone po stronie klienta).
- **CSP w `vercel.json`:** przy problemach z zasobami zewnętrznymi sprawdź nagłówki `Content-Security-Policy` w ustawieniach projektu.

Powiązane: [[01-wdrozenie]] (pełny stack z Supabase), `docs/roadmap-demo.md`.
