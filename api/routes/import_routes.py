"""Import stanu początkowego — saldo lokali z pliku Excel.

W polskim Excelu przecinek to separator dziesiętny w kwotach; w kolumnie numer_lokalu
ten sam znak oddziela wiele numerów — import rozróżnia kolumny. Wartości liczbowe
z arkusza są w Pythonie często reprezentowane z kropką (wewnętrzny format float)."""

import io
import logging
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse

from api.core.security import require_admin
from api.core.supabase_client import get_supabase
from api.models.schemas import ImportInitialStateResult, ImportRowResult

router = APIRouter(prefix="/import", tags=["import"])
logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# ──────────────────────────────────────────────
# Format pliku:
#   Wiersz 1:   | data_salda | <data> |
#   Wiersz 2:   | numer_lokalu | saldo_poczatkowe |
#   Wiersz 3+:  dane lokali
# ──────────────────────────────────────────────


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _parse_date(value) -> date | None:
    """Parsuj datę z formatu YYYY-MM-DD lub DD.MM.YYYY. Obsługuje też obiekty date/datetime z openpyxl."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_decimal(value) -> Decimal | None:
    """Parsuj liczbę dziesiętną z dowolnego formatu (przecinek/kropka jako separator)."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    s = str(value).strip().replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _normalize_str(value) -> str:
    """Zamień wartość komórki na string i przytnij białe znaki."""
    if value is None:
        return ""
    return str(value).strip()



def _normalize_apartment_separators(s: str) -> str:
    """Ujednolicenie przecinka/kropki z Excela (w tym znaki „wide\" U+FF0C / U+FF0E) oraz NBSP."""
    if not s:
        return ""
    for code in (0xFF0C, 0xFE50, 0x201A, 0x060C, 0x3001):
        s = s.replace(chr(code), ",")
    for code in (0xFF0E, 0x2024):
        s = s.replace(chr(code), ".")
    s = s.replace(chr(0x00A0), " ")
    return s.strip()


def _cell_to_apartment_text(value) -> str:
    """
    Tekst z komórki numer_lokalu.

    Excel (PL) pokazuje przecinki, ale komórka liczbowa jest w pamięci jako float — Python
    zapisuje ją z kropką (np. 25,26 z arkusza → 25.26). To nie zmienia znaczenia: dalej
    rozbijamy na lokale 25 i 26. Tekst „3,4A” zostaje z przecinkami do _parse_apartment_numbers.
    """
    if value is None:
        return ""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            return ""
        r = round(value, 6)
        if abs(r - round(r)) < 1e-9:
            return str(int(round(r)))
        return format(r, ".6f").rstrip("0").rstrip(".")
    if isinstance(value, (datetime, date)):
        return ""
    return _normalize_apartment_separators(str(value).strip())


def _expand_apartment_chunk(chunk: str) -> list[str]:
    """Rozbija fragment (np. „25.26”, „3.4A”) po zasadach Excel/PL."""
    if re.fullmatch(r"\d{2,}\.\d{2,}", chunk):
        left, right = chunk.split(".", 1)
        return [left, right]
    m = re.fullmatch(r"(\d+)\.(\d+[A-Za-z]+)", chunk)
    if m:
        return [m.group(1), m.group(2)]
    return [chunk]


def _parse_apartment_numbers(raw: str) -> list[str]:
    """
    Rozbija komórkę numer_lokalu na pojedyncze numery.

    - Lista po przecinku/średniku/tabulatorze/pionowej kresce: „18,31,42”, „3,4A”, „25,26”.
    - Gdy Excel zwrócił float (np. 25,26 jako liczba), w raw jest „25.26” — rozbicie po kropce
      na dwie grupy cyfr (≥2 cyfry z każdej strony), żeby uzyskać lokale 25 i 26.
    - Gdy Excel zapisał „3,4A” jako tekst „3.4A” (kropka zamiast przecinka) — rozbicie na 3 i 4A.
    """
    s = _normalize_apartment_separators(_normalize_str(raw))
    if not s:
        return []
    out: list[str] = []
    for chunk in re.split("[,;	|]+", s):
        chunk = chunk.strip()
        if not chunk:
            continue
        out.extend(_expand_apartment_chunk(chunk))
    return out

def _build_template_xlsx() -> bytes:
    """Generuj plik szablonu .xlsx."""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        raise HTTPException(status_code=500, detail="Biblioteka openpyxl nie jest zainstalowana")

    wb = Workbook()
    ws = wb.active
    ws.title = "Stan początkowy"

    date_label_fill = PatternFill("solid", fgColor="FFF2CC")
    date_label_font = Font(bold=True)
    header_fill = PatternFill("solid", fgColor="4472C4")
    header_font = Font(bold=True, color="FFFFFF")

    # Wiersz 1: data_salda (global)
    ws.cell(row=1, column=1, value="data_salda").font = date_label_font
    ws.cell(row=1, column=1).fill = date_label_fill
    ws.cell(row=1, column=2, value="2024-12-31").fill = date_label_fill
    ws.cell(row=1, column=2).alignment = Alignment(horizontal="left")

    # Wiersz 2: nagłówki kolumn
    for col, header in enumerate(["numer_lokalu", "saldo_poczatkowe"], start=1):
        cell = ws.cell(row=2, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    # Przykładowe wiersze
    examples = [
        ("1A", -200.50),
        ("1B", 0.00),
        ("2A", 150.00),
        ("3A", -50.75),
    ]
    for row_idx, (nr, saldo) in enumerate(examples, start=3):
        ws.cell(row=row_idx, column=1, value=nr)
        ws.cell(row=row_idx, column=2, value=saldo)

    # Szerokości kolumn
    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 22

    # Komentarz
    ws.cell(row=9, column=1, value="Uwagi:").font = Font(bold=True)
    ws.cell(row=10, column=1, value="• data_salda (wiersz 1, kolumna B): format YYYY-MM-DD lub DD.MM.YYYY — obowiązuje dla wszystkich lokali")
    ws.cell(row=11, column=1, value="• numer_lokalu musi odpowiadać istniejącemu lokalowi w systemie")
    ws.cell(row=12, column=1, value="• grupa lokali w jednej komórce: oddziel przecinkiem lub średnikiem; zapis „25.26” (dwie liczby po 2+ cyfr) = lokale 25 i 26")
    ws.cell(row=13, column=1, value="• saldo_poczatkowe: ujemne = zaległość, dodatnie = nadpłata (PLN) — wspólne dla wszystkich lokali z wiersza")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


def _parse_workbook(content: bytes):
    """
    Parsuj plik xlsx i zwróć (global_date, col_idx, data_rows, header_row_idx).

    Oczekiwany format:
      Wiersz 1: | data_salda | <data> |
      Wiersz 2: | numer_lokalu | saldo_poczatkowe |
      Wiersz 3+: dane
    """
    try:
        from openpyxl import load_workbook
    except ImportError:
        raise HTTPException(status_code=500, detail="Biblioteka openpyxl nie jest zainstalowana")

    try:
        wb = load_workbook(io.BytesIO(content), read_only=False, data_only=True)
        ws = wb.active
        all_rows = list(ws.iter_rows(values_only=True))
        wb.close()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Nie można otworzyć pliku Excel: {e}")

    if not all_rows:
        raise HTTPException(status_code=422, detail="Plik jest pusty")

    # Szukaj wiersza data_salda i wiersza nagłówków
    global_date: date | None = None
    header_row_idx: int | None = None

    for i, row in enumerate(all_rows):
        first = _normalize_str(row[0] if row else None).lower()
        if first == "data_salda":
            val = row[1] if len(row) > 1 else None
            global_date = _parse_date(val)
            if global_date is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"Nieprawidłowa wartość data_salda: {val!r}. Użyj formatu YYYY-MM-DD lub DD.MM.YYYY.",
                )
        elif first == "numer_lokalu":
            header_row_idx = i
            break

    if global_date is None:
        raise HTTPException(
            status_code=422,
            detail="Brak wiersza data_salda. Dodaj w wierszu 1: | data_salda | 2024-12-31 |",
        )
    if header_row_idx is None:
        raise HTTPException(
            status_code=422,
            detail="Brak wiersza nagłówków (numer_lokalu, saldo_poczatkowe).",
        )

    headers = [_normalize_str(h).lower() for h in all_rows[header_row_idx]]
    if "saldo_poczatkowe" not in headers:
        raise HTTPException(status_code=422, detail="Brakująca kolumna: saldo_poczatkowe")

    col_idx = {name: headers.index(name) for name in ("numer_lokalu", "saldo_poczatkowe") if name in headers}
    data_rows = all_rows[header_row_idx + 1:]

    return global_date, col_idx, data_rows, header_row_idx


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.get("/template")
async def download_template(
    _admin: dict = Depends(require_admin),
):
    """Pobierz szablon Excel dla importu stanu początkowego."""
    xlsx_bytes = _build_template_xlsx()
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=szablon_stan_poczatkowy.xlsx"},
    )


@router.post("/initial-state", response_model=ImportInitialStateResult)
async def import_initial_state(
    file: UploadFile = File(...),
    dry_run: bool = Query(default=True, description="true = tylko podgląd (bez zmian w bazie)"),
    _admin: dict = Depends(require_admin),
):
    """
    Importuj stan początkowy (saldo) lokali z pliku Excel.

    Format pliku:
    - Wiersz 1: | data_salda | <data> | (jedna globalna data dla wszystkich lokali)
    - Wiersz 2: | numer_lokalu | saldo_poczatkowe | (nagłówki)
    - Wiersze 3+: dane lokali

    - Aktualizuje tylko istniejące lokale (po numerze); nieznane numery → skipped.
    - W jednej komórce można podać wiele lokali (np. „18,31,42” lub „25.26”) — to samo saldo dla każdego.
    - dry_run=true (domyślnie): zwraca podgląd bez zapisu do bazy.
    """
    sb = get_supabase()

    # Walidacja rozszerzenia i rozmiaru
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=422, detail="Plik musi być w formacie .xlsx")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Plik zbyt duży (maks. 5 MB)")

    # Parsowanie struktury pliku
    global_date, col_idx, data_rows, header_row_idx = _parse_workbook(content)

    # Wczytaj wszystkie lokale z bazy (number → id)
    apts_res = sb.table("apartments").select("id, number").execute()
    apartments_by_number: dict[str, str] = {a["number"]: a["id"] for a in (apts_res.data or [])}

    # ── Przetwarzanie wierszy ──
    row_results: list[ImportRowResult] = []
    updates: dict[str, dict] = {}  # apartment_id → payload

    for idx, row in enumerate(data_rows):
        row_num = header_row_idx + 2 + idx
        nr_idx = col_idx.get("numer_lokalu")
        saldo_idx = col_idx.get("saldo_poczatkowe")

        nr_raw = row[nr_idx] if nr_idx is not None and nr_idx < len(row) else None
        nr_cell = _cell_to_apartment_text(nr_raw)
        if not nr_cell:
            row_results.append(ImportRowResult(
                row=row_num, apartment_number="", status="skipped",
                message="Pusta komórka numer_lokalu",
            ))
            continue

        # Jedna pozycja w bazie: np. „3,4A”, „25,26” (zbiorczy zapis) — bez rozbijania na części
        if nr_cell in apartments_by_number:
            numbers = [nr_cell]
        else:
            numbers = _parse_apartment_numbers(nr_cell)
        if not numbers:
            row_results.append(ImportRowResult(
                row=row_num, apartment_number=nr_cell, status="skipped",
                message="Pusta komórka numer_lokalu",
            ))
            continue

        saldo_raw = row[saldo_idx] if saldo_idx is not None and saldo_idx < len(row) else None
        saldo = _parse_decimal(saldo_raw)
        if saldo is None:
            row_results.append(ImportRowResult(
                row=row_num, apartment_number=nr_cell, status="error",
                message=f"Nieprawidłowa wartość saldo_poczatkowe: {saldo_raw!r}",
            ))
            continue

        payload = {
            "initial_balance": float(saldo.quantize(Decimal("0.01"))),
            "initial_balance_date": global_date.isoformat(),
        }

        missing: list[str] = []
        found_any = False
        seen_apt_ids: set[str] = set()

        for n in numbers:
            apt_id = apartments_by_number.get(n)
            if apt_id is None:
                missing.append(n)
                continue
            found_any = True
            if apt_id not in seen_apt_ids:
                updates[apt_id] = payload
                seen_apt_ids.add(apt_id)

        if not found_any:
            row_results.append(ImportRowResult(
                row=row_num, apartment_number=nr_cell, status="skipped",
                message="Lokal nie istnieje w systemie",
            ))
            continue

        extra_msg = None
        if missing:
            extra_msg = "Brak lokali w systemie: " + ", ".join(missing)

        row_results.append(ImportRowResult(
            row=row_num,
            apartment_number=nr_cell,
            status="updated",
            message=extra_msg,
        ))

    # ── Zapis do bazy (jeśli nie dry_run) ──
    if not dry_run:
        for apt_id, payload in updates.items():
            sb.table("apartments").update(payload).eq("id", apt_id).execute()

    # ── Podsumowanie ──
    return ImportInitialStateResult(
        dry_run=dry_run,
        rows_total=len(row_results),
        updated=sum(1 for r in row_results if r.status == "updated"),
        skipped=sum(1 for r in row_results if r.status == "skipped"),
        errors=sum(1 for r in row_results if r.status == "error"),
        rows=row_results,
    )
