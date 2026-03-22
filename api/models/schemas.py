from pydantic import BaseModel, EmailStr


class ResidentCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    apartment_number: str | None = None
    role: str = "resident"


class ResidentUpdate(BaseModel):
    full_name: str | None = None
    apartment_number: str | None = None
    role: str | None = None
    is_active: bool | None = None


class ResidentOut(BaseModel):
    id: str
    email: str
    full_name: str
    apartment_number: str | None
    role: str
    is_active: bool
    created_at: str


class MessageOut(BaseModel):
    detail: str


class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    apartment_number: str | None = None
    subject: str
    message: str


# --- Resolutions (Uchwały) ---

class ResolutionCreate(BaseModel):
    title: str
    description: str | None = None
    document_id: str | None = None
    voting_start: str | None = None
    voting_end: str | None = None
    status: str = "draft"


class ResolutionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    document_id: str | None = None
    voting_start: str | None = None
    voting_end: str | None = None
    status: str | None = None


class ResolutionOut(BaseModel):
    id: str
    title: str
    description: str | None
    document_id: str | None
    voting_start: str | None
    voting_end: str | None
    status: str
    created_at: str


class VoteCreate(BaseModel):
    vote: str  # 'za', 'przeciw', 'wstrzymuje'


class VoteOut(BaseModel):
    id: str
    resolution_id: str
    resident_id: str
    vote: str
    voted_at: str


class VoteResults(BaseModel):
    za: int = 0
    przeciw: int = 0
    wstrzymuje: int = 0
    total: int = 0
