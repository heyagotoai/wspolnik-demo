"""Parser zestawień bankowych (.xls) z automatycznym dopasowaniem do lokali.

Logika przeniesiona z clean_data.py i zrefaktoryzowana pod:
- czyste funkcje (bez pandas, bez I/O plikowego, bez interaktywnych input())
- rejestr dopasowania z bazy (apartments.number + apartments.billing_surname)
- zgodność wyjścia z istniejącym importem wpłat (apartment_id, data, kwota)
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Sequence


# ──────────────────────────────────────────────
# Normalizacja tekstu
# ──────────────────────────────────────────────

def normalize_text(s: str | None) -> str:
    """Wielkie litery, usunięcie polskich diakrytyków (NFKD), Ł→L."""
    if not s:
        return ""
    s = str(s).upper().strip()
    s = s.replace("Ł", "L")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s


def _surname_family_key(name: str) -> str:
    """Ujednolica warianty nazwiska (SKA→SKI, SCA→SCY, CKA→CKI)."""
    t = normalize_text(name)
    if not t:
        return ""
    for fem, masc in (("SKA", "SKI"), ("SCA", "SCY"), ("CKA", "CKI")):
        if t.endswith(fem) and len(t) > len(fem):
            return t[: -len(fem)] + masc
    return t


def surnames_same_family(n1: str | None, n2: str | None) -> bool:
    a = _surname_family_key(n1 or "")
    b = _surname_family_key(n2 or "")
    return bool(a) and a == b


# ──────────────────────────────────────────────
# Rejestr dopasowania (z bazy)
# ──────────────────────────────────────────────

@dataclass
class ApartmentRecord:
    """Jeden wpis rejestru: lokal + nazwisko rozliczeniowe."""
    apartment_id: str
    number: str  # np. "25,26" lub "7A"
    billing_surname: str | None
    billing_group_id: str | None = None
    group_records: list['ApartmentRecord'] | None = None

    @property
    def number_tokens(self) -> set[str]:
        """Rozbija numer na zbiór tokenów, np. '25,26' → {'25', '26'}."""
        parts = re.split(r"\s*,\s*", self.number.strip())
        return {p.strip().upper() for p in parts if p.strip()}


@dataclass
class MatchedPayment:
    """Jedna dopasowana wpłata gotowa do zapisu."""
    apartment_id: str
    apartment_number: str
    billing_group_id: str | None
    payment_date: date
    amount: Decimal
    match_confidence: float  # 0.0 – 1.0
    match_details: str  # opis skąd dopasowanie
    # Wszystkie lokale do splitu (gdy dopasowanie trafia w grupę rozliczeniową)
    group_records: list[ApartmentRecord] | None = None


@dataclass
class UnmatchedTransaction:
    """Transakcja bez jednoznacznego dopasowania."""
    row_index: int
    payment_date: date | None
    amount: Decimal | None
    sender_name: str
    description: str
    reason: str  # dlaczego nie dopasowano


@dataclass
class ParseResult:
    """Wynik parsowania zestawienia bankowego."""
    matched: list[MatchedPayment] = field(default_factory=list)
    unmatched: list[UnmatchedTransaction] = field(default_factory=list)
    total_rows: int = 0


# ──────────────────────────────────────────────
# Ekstrakcja lokalu z tekstu
# ──────────────────────────────────────────────

def extract_apartment_from_address(address: str | None) -> str | None:
    """Wyciąga numer lokalu z adresu nadawcy (ul. Gdańska 58 + wzorce)."""
    if not address:
        return None
    a = str(address).upper()
    if not re.search(r"GDA[NŃ]SK", a) or "58" not in a:
        return None
    patterns = [
        r"58\s*M\.?\s*(\d+[A-Z]?)",
        r"58\s*/\s*(\d+[A-Z]?)",
        r"58\s*-\s*(\d+[A-Z]?)",
        r"58\D+(\d+[A-Z]?)(?!\d)",
    ]
    for p in patterns:
        m = re.search(p, a)
        if m:
            return m.group(1)
    return None


def extract_apartment_from_description(description: str | None) -> str | None:
    """Numer lokalu z tytułu/opisu przelewu.

    Zwraca pojedynczy numer albo kilka po przecinku (np. ``11,16``), gdy w opisie
    jest kilka lokali (wspólna wpłata za grupę).
    """
    if not description:
        return None
    s = str(description)

    # Bank: "ZA LOKAL NR 2 5,26" — brakująca "5" → 25,26
    m_split = re.search(r"(?i)lokal\s+nr\s+(\d)\s+(\d)\s*,\s*(\d+)", s)
    if m_split:
        return f"{m_split.group(1)}{m_split.group(2)},{m_split.group(3)}"

    # "GDAŃSKA 58/9" w opisie
    if re.search(r"(?i)GDA[ŃN]SK", s) and "58" in s:
        for w in (
            r"58\s*/\s*(\d+[A-Za-z]?)",
            r"58\s*M\.?\s*(\d+[A-Za-z]?)",
            r"58\s*-\s*(\d+[A-Za-z]?)",
        ):
            m2 = re.search(w, s)
            if m2:
                return m2.group(1)

    # Wiele lokali: "LOKAL NR 11,16" / "nr 11, 16" / "nr 11;16" (przed pojedynczym NR)
    m_multi = re.search(
        r"(?i)lokal\s*nr\s*((?:\d+[A-Za-z]?)(?:\s*[,;/]\s*\d+[A-Za-z]?)+)",
        s,
    )
    if m_multi:
        raw = m_multi.group(1)
        parts = [p.strip() for p in re.split(r"[,;/]", raw) if p.strip()]
        if len(parts) >= 2:
            return ",".join(parts)

    # "lokal nr 11 i 16" (dwa lokale)
    m_i = re.search(
        r"(?i)lokal\s*nr\s*(\d+[A-Za-z]?)\s+i\s+(\d+[A-Za-z]?)(?!\d)",
        s,
    )
    if m_i:
        return f"{m_i.group(1)},{m_i.group(2)}"

    # "LOKAL NR 7" / "LOKAL NR7A"
    m_nr = re.search(r"(?i)lokal\s*nr\s*(\d+[A-Za-z]?)(?!\d)", s)
    if m_nr:
        return m_nr.group(1)
    return None


# ──────────────────────────────────────────────
# Szukanie nazwiska w tekście
# ──────────────────────────────────────────────

def find_surname_in_text(
    text: str | None,
    surnames_sorted: list[str],
) -> str | None:
    """Szuka nazwiska z rejestru w tekście (od najdłuższych, substring)."""
    t = normalize_text(text)
    if not t:
        return None
    # Pełna nazwa instytucji AMW
    if "AGENCJA" in t and "MIENIA" in t and "WOJSKOWEGO" in t:
        return "AMW"
    for surname in surnames_sorted:
        if normalize_text(surname) in t:
            return surname
    return None


# ──────────────────────────────────────────────
# Dopasowanie transakcji do rejestru
# ──────────────────────────────────────────────

def _normalize_apartment_number(x: str | None) -> str | None:
    if not x:
        return None
    s = re.sub(r"\s+", "", str(x).strip().upper())
    return s or None


def _find_records_for_apartment(
    candidate: str | None, registry: list[ApartmentRecord]
) -> list[ApartmentRecord]:
    """Znajduje rekordy rejestru pasujące do kandydata na numer lokalu.

    Obsługuje też kilka numerów w jednym opisie (``11,16``): wtedy zbiera
    dopasowania dla każdego składnika i usuwa duplikaty po ``apartment_id``.
    """
    nk = _normalize_apartment_number(candidate)
    if not nk:
        return []
    results: list[ApartmentRecord] = []
    for rec in registry:
        raw_norm = _normalize_apartment_number(rec.number)
        if raw_norm == nk or nk in rec.number_tokens:
            results.append(rec)
    if results:
        return results

    # Kilka lokali w opisie — brak jednego rekordu „11,16", szukaj 11 i 16 osobno
    if "," in nk:
        parts = [p.strip() for p in nk.split(",") if p.strip()]
        if len(parts) >= 2:
            seen: set[str] = set()
            for p in parts:
                for rec in _find_records_for_apartment(p, registry):
                    if rec.apartment_id not in seen:
                        seen.add(rec.apartment_id)
                        results.append(rec)
            return results
    return []


def _find_records_for_surname(
    candidate: str | None, registry: list[ApartmentRecord]
) -> list[ApartmentRecord]:
    """Znajduje rekordy rejestru z pasującym nazwiskiem."""
    if not candidate:
        return []
    nk = normalize_text(candidate)
    return [r for r in registry if r.billing_surname and normalize_text(r.billing_surname) == nk]


def _surname_hits_are_one_group(hits: list[ApartmentRecord]) -> bool:
    """Czy wszystkie trafienia nazwiskowe należą do jednej grupy rozliczeniowej."""
    if not hits:
        return False
    group_ids = {r.billing_group_id for r in hits}
    return len(group_ids) == 1 and None not in group_ids


def match_transaction(
    sender_name: str | None,
    sender_address: str | None,
    description: str | None,
    registry: list[ApartmentRecord],
    surnames_sorted: list[str],
) -> tuple[ApartmentRecord | None, float, str]:
    """
    Dopasowuje jedną transakcję bankową do rekordu rejestru.

    Zwraca: (rekord | None, pewność 0..1, opis dopasowania).
    Gdy dopasowanie wskazuje na grupę rozliczeniową (wiele lokali z tym samym
    billing_group_id), zwrócony rekord ma ustawione group_records z pełną listą.

    Priorytet:
    1. Jednoznaczny lokal z opisu przelewu
    2. Jednoznaczny lokal z adresu nadawcy
    3. Jednoznaczne nazwisko z tekstu (w tym grupa lokali tego samego właściciela)
    4. Przecięcie zbiorów (lokal + nazwisko)
    5. Fallback: głosowanie wagowe
    """
    # Ekstrakcja kandydatów
    apt_from_desc = extract_apartment_from_description(description)
    apt_from_addr = extract_apartment_from_address(sender_address)
    surname_from_name = find_surname_in_text(sender_name, surnames_sorted)
    surname_from_desc = find_surname_in_text(description, surnames_sorted)

    # Rekordy z rejestru
    hits_desc = _find_records_for_apartment(apt_from_desc, registry)
    hits_addr = _find_records_for_apartment(apt_from_addr, registry)
    hits_surname_name = _find_records_for_surname(surname_from_name, registry)
    hits_surname_desc = _find_records_for_surname(surname_from_desc, registry)

    # Wszystkie trafienia nazwiska (unikalne po apartment_id)
    seen_ids: set[str] = set()
    hits_surname: list[ApartmentRecord] = []
    for r in hits_surname_desc + hits_surname_name:
        if r.apartment_id not in seen_ids:
            hits_surname.append(r)
            seen_ids.add(r.apartment_id)

    # 1. Lokal(e) z opisu — jeden rekord albo kilka w jednej grupie rozliczeniowej
    if len(hits_desc) == 1:
        rec = hits_desc[0]
        # Sprawdź czy nazwisko z tekstu nie wskazuje na inny lokal
        if len(hits_surname) >= 1 and all(h.apartment_id != rec.apartment_id for h in hits_surname):
            surname_label = hits_surname[0].billing_surname
            if not surnames_same_family(rec.billing_surname, surname_label):
                # Nazwisko silniejsze niż lokal z opisu (np. AMW)
                primary = hits_surname[0]
                if _surname_hits_are_one_group(hits_surname):
                    primary.group_records = hits_surname
                return primary, 0.8, f"nazwisko '{surname_label}' z tekstu (konflikt z lokalem {apt_from_desc} z opisu)"
        return rec, 0.9, f"lokal {apt_from_desc} z opisu przelewu"

    if len(hits_desc) > 1 and _surname_hits_are_one_group(hits_desc):
        primary = hits_desc[0]
        primary.group_records = list(hits_desc)
        nums = ", ".join(r.number for r in sorted(hits_desc, key=lambda x: x.number))
        return primary, 0.9, f"lokale {nums} z opisu przelewu (grupa rozliczeniowa)"

    # 2. Jednoznaczny lokal z adresu
    if len(hits_addr) == 1:
        return hits_addr[0], 0.85, f"lokal {apt_from_addr} z adresu nadawcy"

    # 3. Nazwisko — jedno trafienie LUB wiele z jednej grupy rozliczeniowej
    if len(hits_surname) == 1:
        return hits_surname[0], 0.75, f"nazwisko '{hits_surname[0].billing_surname}' z tekstu"

    if len(hits_surname) > 1 and _surname_hits_are_one_group(hits_surname):
        primary = hits_surname[0]
        primary.group_records = hits_surname
        names = ", ".join(r.number for r in hits_surname)
        return primary, 0.75, f"nazwisko '{primary.billing_surname}' z tekstu (grupa: {names})"

    # 4. Przecięcie: lokal + nazwisko
    all_apt_hits_ids = {r.apartment_id for r in hits_desc + hits_addr}
    all_surname_ids = {r.apartment_id for r in hits_surname}
    intersection = all_apt_hits_ids & all_surname_ids
    if len(intersection) == 1:
        rec = next(r for r in registry if r.apartment_id in intersection)
        return rec, 0.7, "przecięcie dopasowań lokal + nazwisko"

    # 5. Głosowanie wagowe
    scores: dict[str, float] = {}
    rec_map: dict[str, ApartmentRecord] = {r.apartment_id: r for r in registry}

    def add_score(records: list[ApartmentRecord], weight: float):
        for r in records:
            scores[r.apartment_id] = scores.get(r.apartment_id, 0) + weight

    add_score(hits_desc, 3.0)
    add_score(hits_addr, 3.0)
    add_score(hits_surname, 2.0)

    if scores:
        best_id = max(scores, key=lambda k: scores[k])
        confidence = min(1.0, scores[best_id] / 8.0)
        if confidence >= 0.3:
            return rec_map[best_id], confidence, "głosowanie wagowe (niższa pewność)"

    return None, 0.0, "brak dopasowania"


# ──────────────────────────────────────────────
# Parsowanie pliku .xls
# ──────────────────────────────────────────────

EXPECTED_COLUMNS = {
    "data operacji",
    "kwota",
    "nazwa nadawcy",
    "adres nadawcy",
    "opis transakcji",
}

# Kolumny opcjonalne, pomijane przy imporcie
OPTIONAL_COLUMNS = {
    "data waluty", "typ transakcji", "waluta",
    "rachunek nadawcy", "rachunek odbiorcy",
    "nazwa odbiorcy", "adres odbiorcy",
}


def _parse_xls_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_xls_amount(value) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    s = str(value).strip().replace(",", ".").replace(" ", "")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def read_xls_file(content: bytes) -> tuple[list[str], list[list]]:
    """
    Czyta plik .xls i zwraca (nagłówki, wiersze_danych).
    Rzuca ValueError przy problemach z formatem.
    """
    try:
        import xlrd
    except ImportError:
        raise ValueError("Biblioteka xlrd nie jest zainstalowana")

    try:
        wb = xlrd.open_workbook(file_contents=content)
    except Exception as e:
        raise ValueError(f"Nie można otworzyć pliku .xls: {e}")

    sheet = wb.sheet_by_index(0)
    if sheet.nrows < 2:
        raise ValueError("Plik jest pusty lub zawiera tylko nagłówki")

    headers = [str(sheet.cell_value(0, c)).strip() for c in range(sheet.ncols)]

    rows = []
    for r in range(1, sheet.nrows):
        row_data = []
        for c in range(sheet.ncols):
            cell = sheet.cell(r, c)
            if cell.ctype == xlrd.XL_CELL_DATE:
                # xlrd date tuple → datetime
                dt_tuple = xlrd.xldate_as_tuple(cell.value, wb.datemode)
                row_data.append(datetime(*dt_tuple))
            elif cell.ctype == xlrd.XL_CELL_NUMBER:
                row_data.append(cell.value)
            elif cell.ctype == xlrd.XL_CELL_EMPTY:
                row_data.append(None)
            else:
                row_data.append(str(cell.value).strip())
        rows.append(row_data)

    return headers, rows


def validate_columns(headers: list[str]) -> dict[str, int]:
    """
    Waliduje obecność wymaganych kolumn. Zwraca mapę nazwa → indeks.
    Rzuca ValueError jeśli brakuje kolumn.
    """
    header_lower = [h.lower().strip() for h in headers]
    col_map: dict[str, int] = {}
    missing: list[str] = []
    for expected in EXPECTED_COLUMNS:
        try:
            col_map[expected] = header_lower.index(expected)
        except ValueError:
            missing.append(expected)
    if missing:
        raise ValueError(
            f"Brakujące kolumny: {', '.join(missing)}. "
            f"Znalezione: {', '.join(h for h in headers if h.strip())}"
        )
    return col_map


# ──────────────────────────────────────────────
# Główna funkcja parsowania
# ──────────────────────────────────────────────

def parse_bank_statement(
    content: bytes,
    registry: list[ApartmentRecord],
) -> ParseResult:
    """
    Parsuje plik .xls zestawienia bankowego i dopasowuje transakcje do lokali.

    Args:
        content: zawartość pliku .xls
        registry: lista rekordów z bazy (apartments)

    Returns:
        ParseResult z dopasowanymi i niedopasowanymi transakcjami
    """
    headers, rows = read_xls_file(content)
    col_map = validate_columns(headers)

    # Posortowane nazwiska (od najdłuższych) do wyszukiwania w tekście
    surnames_sorted = sorted(
        [r.billing_surname for r in registry if r.billing_surname],
        key=len,
        reverse=True,
    )
    # Deduplikacja zachowując kolejność
    seen: set[str] = set()
    unique_surnames: list[str] = []
    for s in surnames_sorted:
        if s not in seen:
            unique_surnames.append(s)
            seen.add(s)

    result = ParseResult(total_rows=len(rows))

    for row_idx, row in enumerate(rows):
        def cell(col_name: str):
            idx = col_map[col_name]
            return row[idx] if idx < len(row) else None

        amount_raw = cell("kwota")
        amount = _parse_xls_amount(amount_raw)

        # Pomijamy transakcje z kwotą ≤ 0 (wypłaty, opłaty bankowe)
        if amount is None or amount <= 0:
            continue

        date_raw = cell("data operacji")
        payment_date = _parse_xls_date(date_raw)

        sender_name = cell("nazwa nadawcy")
        sender_name = str(sender_name) if sender_name else None
        sender_address = cell("adres nadawcy")
        sender_address = str(sender_address) if sender_address else None
        description = cell("opis transakcji")
        description = str(description) if description else None

        if payment_date is None:
            result.unmatched.append(UnmatchedTransaction(
                row_index=row_idx + 2,  # +2: nagłówek + 1-indexed
                payment_date=None,
                amount=amount,
                sender_name=sender_name or "",
                description=description or "",
                reason=f"Nieprawidłowa data operacji: {date_raw!r}",
            ))
            continue

        rec, confidence, details = match_transaction(
            sender_name, sender_address, description,
            registry, unique_surnames,
        )

        if rec is not None and confidence >= 0.3:
            result.matched.append(MatchedPayment(
                apartment_id=rec.apartment_id,
                apartment_number=rec.number,
                billing_group_id=rec.billing_group_id,
                payment_date=payment_date,
                amount=amount.quantize(Decimal("0.01")),
                match_confidence=confidence,
                match_details=details,
                group_records=rec.group_records,
            ))
        else:
            result.unmatched.append(UnmatchedTransaction(
                row_index=row_idx + 2,
                payment_date=payment_date,
                amount=amount,
                sender_name=sender_name or "",
                description=description or "",
                reason=details if not rec else f"Zbyt niska pewność ({confidence:.0%})",
            ))

    return result
