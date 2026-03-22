import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Frontend origin for CORS
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Secret for Vercel Cron Jobs (set in Vercel env vars)
CRON_SECRET: str | None = os.getenv("CRON_SECRET")
