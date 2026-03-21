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
