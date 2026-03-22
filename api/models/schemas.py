from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


# --- Shared types ---

RoleType = Literal["admin", "resident"]
ResolutionStatus = Literal["draft", "voting", "closed"]
VoteValue = Literal["za", "przeciw", "wstrzymuje"]
ChargeRateType = Literal["eksploatacja", "fundusz_remontowy", "smieci"]


# --- Residents ---

class ResidentCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    apartment_number: str | None = Field(default=None, max_length=20)
    role: RoleType = "resident"

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Imię i nazwisko nie może być puste")
        return v.strip()


class ResidentUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    apartment_number: str | None = Field(default=None, max_length=20)
    role: RoleType | None = None
    is_active: bool | None = None

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Imię i nazwisko nie może być puste")
        return v.strip() if v else v


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


# --- Contact ---

class ContactMessageCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    apartment_number: str | None = Field(default=None, max_length=20)
    subject: str = Field(..., min_length=2, max_length=255)
    message: str = Field(..., min_length=5, max_length=5000)

    @field_validator("name", "subject")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Pole nie może być puste")
        return v.strip()


# --- Resolutions (Uchwały) ---

class ResolutionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    document_id: str | None = None
    voting_start: str | None = None
    voting_end: str | None = None
    status: ResolutionStatus = "draft"

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Tytuł nie może być pusty")
        return v.strip()

    @field_validator("voting_end")
    @classmethod
    def voting_end_after_start(cls, v: str | None, info) -> str | None:
        start = info.data.get("voting_start")
        if v and start and v < start:
            raise ValueError("Data końca głosowania musi być późniejsza niż data początku")
        return v


class ResolutionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    document_id: str | None = None
    voting_start: str | None = None
    voting_end: str | None = None
    status: ResolutionStatus | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Tytuł nie może być pusty")
        return v.strip() if v else v

    @field_validator("voting_end")
    @classmethod
    def voting_end_after_start(cls, v: str | None, info) -> str | None:
        start = info.data.get("voting_start")
        if v and start and v < start:
            raise ValueError("Data końca głosowania musi być późniejsza niż data początku")
        return v


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
    vote: VoteValue


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


class VoteDetail(BaseModel):
    resident_id: str
    full_name: str
    apartment_number: str | None
    vote: str
    voted_at: str


# --- Profile ---

class ProfileOut(BaseModel):
    id: str
    email: str
    full_name: str
    apartment_number: str | None
    role: str
    is_active: bool
    created_at: str


class ProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Imię i nazwisko nie może być puste")
        return v.strip()


class ChangePassword(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


# --- Charge Rates (Stawki naliczeń) ---

class ChargeRateCreate(BaseModel):
    type: ChargeRateType
    rate_per_unit: Decimal = Field(..., gt=0, max_digits=10, decimal_places=4)
    valid_from: str  # "YYYY-MM-DD"


class ChargeRateOut(BaseModel):
    id: str
    type: str
    rate_per_unit: str
    valid_from: str
    created_at: str


class ChargeGenerateRequest(BaseModel):
    month: str  # "YYYY-MM-DD" (1. dzień miesiąca)


class ChargeGenerateSummary(BaseModel):
    month: str
    apartments_count: int
    charges_created: int
    total_amount: str
    warnings: list[str] = []


# --- Auto-charge settings ---

class AutoChargesConfig(BaseModel):
    enabled: bool = False
    day: int = Field(default=1, ge=1, le=28)


class AutoChargesConfigUpdate(BaseModel):
    enabled: bool | None = None
    day: int | None = Field(default=None, ge=1, le=28)
