import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Frontend origin for CORS
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Secret for Vercel Cron Jobs (set in Vercel env vars)
CRON_SECRET: str | None = os.getenv("CRON_SECRET")

# Wersje obowiązujących dokumentów prawnych (podbić po zmianie PDF/MD; użytkownicy z inną wersją muszą ponownie zaakceptować)
CURRENT_PRIVACY_VERSION: str = os.getenv("CURRENT_PRIVACY_VERSION", "2026-04-03")
CURRENT_TERMS_VERSION: str = os.getenv("CURRENT_TERMS_VERSION", "2026-04-03")
