from decimal import Decimal
from typing import Literal

import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# --- Shared types ---

RoleType = Literal["admin", "resident", "manager"]
ResolutionStatus = Literal["draft", "voting", "closed"]
VoteValue = Literal["za", "przeciw", "wstrzymuje"]
ChargeRateType = Literal["eksploatacja", "fundusz_remontowy", "smieci"]


# --- Residents ---

def _validate_password_strength(v: str) -> str:
    """Min 8 chars, at least one uppercase, one lowercase, one digit."""
    if len(v) < 8:
        raise ValueError("Hasło musi mieć minimum 8 znaków")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Hasło musi zawierać wielką literę")
    if not re.search(r"[a-z]", v):
        raise ValueError("Hasło musi zawierać małą literę")
    if not re.search(r"\d", v):
        raise ValueError("Hasło musi zawierać cyfrę")
    return v


class ResidentCreate(BaseModel):
    """Tworzenie mieszkańca.

    Email i hasło są opcjonalne — brak email = mieszkaniec „bez konta"
    (rejestrowany np. do głosów z zebrania, bez możliwości logowania).
    Gdy email podany, hasło też musi być podane.
    """

    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    apartment_number: str | None = Field(default=None, max_length=20)
    role: RoleType = "resident"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return _validate_password_strength(v)

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Imię i nazwisko nie może być puste")
        return v.strip()

    @model_validator(mode="after")
    def email_and_password_pair(self):
        if self.email and not self.password:
            raise ValueError("Hasło jest wymagane gdy podany jest email")
        if self.password and not self.email:
            raise ValueError("Email jest wymagany gdy podane jest hasło")
        return self


class ResidentUpdate(BaseModel):
    """Aktualizacja mieszkańca.

    `email` + `password` pozwalają „nadać konto" mieszkańcowi bez konta
    (has_account=false → true). Oba pola muszą być podane razem.
    """

    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    apartment_number: str | None = Field(default=None, max_length=20)
    role: RoleType | None = None
    is_active: bool | None = None
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Imię i nazwisko nie może być puste")
        return v.strip() if v else v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return _validate_password_strength(v)

    @model_validator(mode="after")
    def email_and_password_pair(self):
        if (self.email and not self.password) or (self.password and not self.email):
            raise ValueError("Email i hasło muszą być podane razem")
        return self


class ResidentOut(BaseModel):
    id: str
    email: str | None = None
    full_name: str
    apartment_number: str | None
    role: str
    is_active: bool
    has_account: bool = True
    created_at: str


class ApartmentAssign(BaseModel):
    apartment_id: str = Field(..., min_length=1)


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

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ResolutionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    document_id: str | None = None
    voting_start: str = Field(..., min_length=10, max_length=32)
    voting_end: str = Field(..., min_length=10, max_length=32)
    status: ResolutionStatus = "draft"
    is_test: bool = False

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Tytuł nie może być pusty")
        return v.strip()

    @field_validator("voting_start", "voting_end")
    @classmethod
    def iso_date_format(cls, v: str) -> str:
        s = v.strip()
        if not _ISO_DATE.match(s):
            raise ValueError("Oczekiwany format daty: RRRR-MM-DD")
        return s

    @model_validator(mode="after")
    def voting_end_after_start(self):
        if self.voting_end < self.voting_start:
            raise ValueError("Data końca głosowania musi być taka sama lub późniejsza niż początek")
        return self


class ResolutionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=500)
    description: str | None = Field(default=None, max_length=5000)
    document_id: str | None = None
    voting_start: str | None = None
    voting_end: str | None = None
    status: ResolutionStatus | None = None
    is_test: bool | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Tytuł nie może być pusty")
        return v.strip() if v else v

    @field_validator("voting_start", "voting_end")
    @classmethod
    def optional_iso_date(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not _ISO_DATE.match(s):
            raise ValueError("Oczekiwany format daty: RRRR-MM-DD")
        return s

    @model_validator(mode="after")
    def patch_dates_order(self):
        if self.voting_start is not None and self.voting_end is not None:
            if self.voting_end < self.voting_start:
                raise ValueError(
                    "Data końca głosowania musi być taka sama lub późniejsza niż początek",
                )
        return self


class ResolutionOut(BaseModel):
    id: str
    title: str
    description: str | None
    document_id: str | None
    voting_start: str | None
    voting_end: str | None
    status: str
    created_at: str
    is_test: bool = False
    reminder_sent_at: str | None = None


class ReminderSendIn(BaseModel):
    """Opcjonalna whitelist emaili przy ręcznej wysyłce przypomnienia.

    Gdy podana — wysyłka ogranicza się do przecięcia (pending voters ∩ emails).
    Gdy None / pominięte — zachowanie domyślne (wszyscy pending).
    """

    emails: list[str] | None = None


class VoteCreate(BaseModel):
    vote: VoteValue


class VoteRegisterAdmin(BaseModel):
    """Rejestracja głosu oddanego na zebraniu (tylko admin, uchwała w szkicu)."""

    resident_id: str
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
    # Wagi wg pól apartments.share (suma udziałów wspólnoty = 1.0 przy pełnej dokumentacji)
    share_za: float = 0.0
    share_przeciw: float = 0.0
    share_wstrzymuje: float = 0.0
    total_share_community: float = 0.0


class VoteDetail(BaseModel):
    resident_id: str
    full_name: str
    apartment_number: str | None
    apartments_count: int = 0
    share: float = 0.0
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
    can_vote_resolutions: bool = False
    needs_legal_acceptance: bool = False
    current_privacy_version: str = ""
    current_terms_version: str = ""
    privacy_accepted_at: str | None = None
    terms_accepted_at: str | None = None
    privacy_version: str | None = None
    terms_version: str | None = None


class LegalConsentBody(BaseModel):
    accept_privacy: bool = False
    accept_terms: bool = False


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
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


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
    force: bool = False  # True = usuń istniejące auto-naliczenia i wygeneruj ponownie


class ChargeGenerateSummary(BaseModel):
    month: str
    apartments_count: int
    charges_created: int
    total_amount: str
    warnings: list[str] = []
    regenerated: bool = False


# --- Auto-charge settings ---

class AutoChargesConfig(BaseModel):
    enabled: bool = False
    day: int = Field(default=1, ge=1, le=28)


class AutoChargesConfigUpdate(BaseModel):
    enabled: bool | None = None
    day: int | None = Field(default=None, ge=1, le=28)


class BulkNotificationIn(BaseModel):
    apartment_ids: list[str]


class BulkNotificationFailedItem(BaseModel):
    number: str
    error: str


class BulkNotificationOut(BaseModel):
    sent: list[str]
    failed: list[BulkNotificationFailedItem]


class ChargeNotificationBulkIn(BaseModel):
    apartment_ids: list[str]
    valid_from: str | None = None  # MM.YYYY


class ZawiadomienieConfig(BaseModel):
    legal_basis: str


class ZawiadomienieConfigUpdate(BaseModel):
    legal_basis: str | None = None


# --- Billing Groups (Grupy rozliczeniowe) ---

class BillingGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nazwa grupy nie może być pusta")
        return v.strip()


class BillingGroupUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nazwa grupy nie może być pusta")
        return v.strip()


class BillingGroupOut(BaseModel):
    id: str
    name: str
    apartments: list[dict]
    created_at: str


class BillingGroupAssignApartments(BaseModel):
    apartment_ids: list[str] = Field(..., min_length=1)


class BillingGroupPaymentSplit(BaseModel):
    amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    payment_date: str  # YYYY-MM-DD
    title: str | None = None
    split_month: str | None = None  # YYYY-MM-01, defaults to payment_date month


class BillingGroupBalanceOut(BaseModel):
    group_id: str
    group_name: str
    combined_balance: str
    apartments: list[dict]


# --- Import stanu początkowego ---

class ImportRowResult(BaseModel):
    row: int
    apartment_number: str
    status: str  # "updated" | "skipped" | "error"
    message: str | None = None


class ImportInitialStateResult(BaseModel):
    dry_run: bool
    rows_total: int
    updated: int
    skipped: int
    errors: int
    rows: list[ImportRowResult]


class ImportPaymentsResult(BaseModel):
    """Wynik importu wpłat z Excela (ten sam kształt co ImportInitialStateResult)."""

    dry_run: bool
    rows_total: int
    updated: int
    skipped: int
    errors: int
    rows: list[ImportRowResult]


# ── Import z zestawienia bankowego ──


class BankStatementMatchedRow(BaseModel):
    apartment_number: str
    payment_date: str  # ISO
    amount: str  # Decimal as string
    confidence: float
    match_details: str


class BankStatementUnmatchedRow(BaseModel):
    row_index: int
    payment_date: str | None
    amount: str | None
    sender_name: str
    description: str
    reason: str


class ImportBankStatementResult(BaseModel):
    dry_run: bool
    total_rows: int
    matched_count: int
    unmatched_count: int
    matched: list[BankStatementMatchedRow]
    unmatched: list[BankStatementUnmatchedRow]
