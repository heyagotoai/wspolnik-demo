from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import FRONTEND_URL
from api.routes.residents import router as residents_router
from api.routes.contact import router as contact_router
from api.routes.resolutions import router as resolutions_router
from api.routes.profile import router as profile_router
from api.routes.announcements import router as announcements_router
from api.routes.charges import router as charges_router

app = FastAPI(
    title="GABI API",
    description="API wspólnoty mieszkaniowej GABI",
    version="0.1.0",
)

allow_origins = [FRONTEND_URL]
# W dev akceptuj dowolny localhost port
if "localhost" in FRONTEND_URL:
    allow_origins = [f"http://localhost:{p}" for p in range(5170, 5180)]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(residents_router, prefix="/api")
app.include_router(contact_router, prefix="/api")
app.include_router(resolutions_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(announcements_router, prefix="/api")
app.include_router(charges_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
