"""Testy parsera zestawień bankowych i endpointu importu."""

import io
from datetime import date
from decimal import Decimal

import pytest
import xlwt

from api.services.bank_statement_parser import (
    ApartmentRecord,
    normalize_text,
    surnames_same_family,
    extract_apartment_from_address,
    extract_apartment_from_description,
    find_surname_in_text,
    match_transaction,
    read_xls_file,
    validate_columns,
    parse_bank_statement,
)


# ── Helpers ──────────────────────────────────


def _make_xls(headers: list[str], rows: list[list]) -> bytes:
    """Generuje plik .xls w pamięci z podanymi nagłówkami i wierszami."""
    wb = xlwt.Workbook()
    ws = wb.add_sheet("Sheet1")
    for c, h in enumerate(headers):
        ws.write(0, c, h)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            ws.write(r + 1, c, val)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


SAMPLE_REGISTRY = [
    ApartmentRecord(apartment_id="apt-1", number="1", billing_surname="KOSIKOWSKI"),
    ApartmentRecord(apartment_id="apt-2", number="2", billing_surname="WEGNER"),
    ApartmentRecord(apartment_id="apt-7", number="7", billing_surname="SULCZEWSKI"),
    ApartmentRecord(apartment_id="apt-7a", number="7A", billing_surname="SULCZEWSKI"),
    ApartmentRecord(apartment_id="apt-9", number="9", billing_surname="SULCZEWSKA"),
    ApartmentRecord(apartment_id="apt-25-26", number="25,26", billing_surname="SZRAMA"),
    ApartmentRecord(apartment_id="apt-amw", number="18,31,42,44", billing_surname="AMW"),
    ApartmentRecord(apartment_id="apt-33", number="33", billing_surname="JANTZEN"),
]

SAMPLE_HEADERS = [
    "Data operacji", "Data waluty", "Typ transakcji", "Kwota", "Waluta",
    "Rachunek nadawcy", "Rachunek odbiorcy", "Nazwa nadawcy",
    "Nazwa odbiorcy", "Adres nadawcy", "Adres odbiorcy", "Opis transakcji",
]


# ── Unit testy: normalizacja tekstu ──────────


class TestNormalizeText:
    def test_basic(self):
        assert normalize_text("Kowalski") == "KOWALSKI"

    def test_polish_chars(self):
        assert normalize_text("Chełmowski") == "CHELMOWSKI"

    def test_none(self):
        assert normalize_text(None) == ""

    def test_l_slash(self):
        assert normalize_text("Łoś") == "LOS"


class TestSurnamesSameFamily:
    def test_ski_ska(self):
        assert surnames_same_family("SULCZEWSKI", "SULCZEWSKA") is True

    def test_different(self):
        assert surnames_same_family("KOWALSKI", "NOWAK") is False

    def test_none(self):
        assert surnames_same_family(None, "KOWALSKI") is False


# ── Unit testy: ekstrakcja lokalu ────────────


class TestExtractApartmentFromAddress:
    def test_standard(self):
        assert extract_apartment_from_address("UL. GDAŃSKA 58/33 STAROGARD") == "33"

    def test_m_dot(self):
        assert extract_apartment_from_address("GDAŃSKA 58 M.7A STAROGARD") == "7A"

    def test_no_match(self):
        assert extract_apartment_from_address("WARSZAWSKA 10/5") is None

    def test_none(self):
        assert extract_apartment_from_address(None) is None


class TestExtractApartmentFromDescription:
    def test_lokal_nr(self):
        assert extract_apartment_from_description("OPLATA ZA LOKAL NR 33") == "33"

    def test_gdanska_slash(self):
        assert extract_apartment_from_description("CZYNSZ GDAŃSKA 58/9") == "9"

    def test_split_number(self):
        # Bank: "ZA LOKAL NR 2 5,26" → 25,26
        assert extract_apartment_from_description("ZA LOKAL NR 2 5,26") == "25,26"

    def test_no_match(self):
        assert extract_apartment_from_description("PRZELEW WŁASNY") is None


# ── Unit testy: szukanie nazwiska ────────────


class TestFindSurnameInText:
    def test_found(self):
        surnames = ["KOSIKOWSKI", "WEGNER", "SZRAMA"]
        assert find_surname_in_text("JAN KOSIKOWSKI", surnames) == "KOSIKOWSKI"

    def test_longest_first(self):
        surnames = ["KOSIKOWSKI", "KOS"]
        assert find_surname_in_text("ANNA KOSIKOWSKI", surnames) == "KOSIKOWSKI"

    def test_amw_institution(self):
        assert find_surname_in_text(
            "AGENCJA MIENIA WOJSKOWEGO", ["AMW", "KOWALSKI"]
        ) == "AMW"

    def test_not_found(self):
        assert find_surname_in_text("ADAM NOWAK", ["KOWALSKI"]) is None


# ── Unit testy: match_transaction ────────────


class TestMatchTransaction:
    def test_match_by_description(self):
        rec, conf, details = match_transaction(
            sender_name="JAN KOWALSKI",
            sender_address=None,
            description="OPLATA ZA LOKAL NR 33",
            registry=SAMPLE_REGISTRY,
            surnames_sorted=["SULCZEWSKI", "SULCZEWSKA", "KOSIKOWSKI", "SZRAMA", "JANTZEN", "WEGNER", "AMW"],
        )
        assert rec is not None
        assert rec.apartment_id == "apt-33"
        assert conf >= 0.8

    def test_match_by_surname(self):
        rec, conf, details = match_transaction(
            sender_name="ANNA SZRAMA",
            sender_address=None,
            description="CZYNSZ ZA MIESZKANIE",
            registry=SAMPLE_REGISTRY,
            surnames_sorted=["SULCZEWSKI", "SULCZEWSKA", "KOSIKOWSKI", "SZRAMA", "JANTZEN", "WEGNER", "AMW"],
        )
        assert rec is not None
        assert rec.apartment_id == "apt-25-26"
        assert conf >= 0.7

    def test_match_by_address(self):
        rec, conf, details = match_transaction(
            sender_name="NIEZNANY NADAWCA",
            sender_address="UL GDAŃSKA 58/2 STAROGARD GDAŃSKI",
            description="OPŁATA",
            registry=SAMPLE_REGISTRY,
            surnames_sorted=["KOSIKOWSKI", "WEGNER", "SZRAMA"],
        )
        assert rec is not None
        assert rec.apartment_id == "apt-2"

    def test_no_match(self):
        rec, conf, details = match_transaction(
            sender_name="FIRMA XYZ",
            sender_address="KRAKOWSKA 5",
            description="FAKTURA 123",
            registry=SAMPLE_REGISTRY,
            surnames_sorted=["KOSIKOWSKI"],
        )
        assert rec is None
        assert conf == 0.0

    def test_match_billing_group_by_surname(self):
        """Wiele lokali z tym samym nazwiskiem i billing_group_id → dopasowanie jako grupa."""
        group_registry = [
            ApartmentRecord(apartment_id="apt-32", number="32", billing_surname="KULAS", billing_group_id="grp-1"),
            ApartmentRecord(apartment_id="apt-45", number="45", billing_surname="KULAS", billing_group_id="grp-1"),
            ApartmentRecord(apartment_id="apt-1", number="1", billing_surname="KOSIKOWSKI"),
        ]
        rec, conf, details = match_transaction(
            sender_name="ALEKSANDRA KULAS",
            sender_address=None,
            description="OPŁ.EKSPL.+F.REMONT.GDAŃSKA58/3258/ 45",
            registry=group_registry,
            surnames_sorted=["KOSIKOWSKI", "KULAS"],
        )
        assert rec is not None
        assert rec.billing_surname == "KULAS"
        assert conf >= 0.7
        assert rec.group_records is not None
        assert len(rec.group_records) == 2
        group_ids = {r.apartment_id for r in rec.group_records}
        assert group_ids == {"apt-32", "apt-45"}

    def test_match_amw_billing_group(self):
        """AMW — wiele lokali w jednej grupie rozliczeniowej."""
        group_registry = [
            ApartmentRecord(apartment_id="apt-18", number="18", billing_surname="AMW", billing_group_id="grp-amw"),
            ApartmentRecord(apartment_id="apt-31", number="31", billing_surname="AMW", billing_group_id="grp-amw"),
            ApartmentRecord(apartment_id="apt-42", number="42", billing_surname="AMW", billing_group_id="grp-amw"),
            ApartmentRecord(apartment_id="apt-44", number="44", billing_surname="AMW", billing_group_id="grp-amw"),
        ]
        rec, conf, details = match_transaction(
            sender_name="AGENCJA MIENIA WOJSKOWEGO ODDZIAŁ REGIONALNY",
            sender_address=None,
            description="OPŁATY ZA LOKALE",
            registry=group_registry,
            surnames_sorted=["AMW"],
        )
        assert rec is not None
        assert rec.group_records is not None
        assert len(rec.group_records) == 4
        assert "grupa" in details

    def test_amw_institution(self):
        rec, conf, details = match_transaction(
            sender_name="AGENCJA MIENIA WOJSKOWEGO",
            sender_address=None,
            description="OPŁATA ZA LOKALE",
            registry=SAMPLE_REGISTRY,
            surnames_sorted=["SULCZEWSKI", "KOSIKOWSKI", "AMW"],
        )
        assert rec is not None
        assert rec.apartment_id == "apt-amw"


# ── Unit testy: odczyt .xls ─────────────────


class TestReadXlsFile:
    def test_valid_file(self):
        content = _make_xls(
            ["Kolumna A", "Kolumna B"],
            [["wartość 1", 42.0], ["wartość 2", 99.0]],
        )
        headers, rows = read_xls_file(content)
        assert headers == ["Kolumna A", "Kolumna B"]
        assert len(rows) == 2
        assert rows[0][1] == 42.0

    def test_empty_file(self):
        content = _make_xls(["A"], [])
        with pytest.raises(ValueError, match="pusty"):
            read_xls_file(content)

    def test_invalid_format(self):
        with pytest.raises(ValueError, match="otworzyć"):
            read_xls_file(b"this is not an xls file")


class TestValidateColumns:
    def test_all_present(self):
        col_map = validate_columns(SAMPLE_HEADERS)
        assert "kwota" in col_map
        assert "data operacji" in col_map
        assert "nazwa nadawcy" in col_map

    def test_missing_columns(self):
        with pytest.raises(ValueError, match="Brakujące"):
            validate_columns(["Data operacji", "Kwota"])


# ── Integracyjny: parse_bank_statement ───────


class TestParseBankStatement:
    def test_happy_path(self):
        rows = [
            ["2026-01-15", "2026-01-15", "Przelew", 500.0, "PLN",
             "123", "456", "JAN JANTZEN", "WM GABI",
             "UL. GDAŃSKA 58/33 83-200", "", "CZYNSZ ZA LOKAL NR 33"],
        ]
        content = _make_xls(SAMPLE_HEADERS, rows)
        result = parse_bank_statement(content, SAMPLE_REGISTRY)

        assert result.total_rows == 1
        assert len(result.matched) == 1
        assert result.matched[0].apartment_number == "33"
        assert result.matched[0].amount == Decimal("500.00")

    def test_negative_amount_skipped(self):
        """Kwoty ujemne (wypłaty) pomijane."""
        rows = [
            ["2026-01-15", "2026-01-15", "Przelew", -100.0, "PLN",
             "123", "456", "JAN JANTZEN", "WM GABI",
             "UL. GDAŃSKA 58/33", "", "CZYNSZ"],
        ]
        content = _make_xls(SAMPLE_HEADERS, rows)
        result = parse_bank_statement(content, SAMPLE_REGISTRY)
        assert len(result.matched) == 0
        assert len(result.unmatched) == 0

    def test_unmatched_transaction(self):
        rows = [
            ["2026-01-15", "2026-01-15", "Przelew", 200.0, "PLN",
             "123", "456", "FIRMA XYZ", "WM GABI",
             "KRAKOWSKA 5", "", "FAKTURA 123"],
        ]
        content = _make_xls(SAMPLE_HEADERS, rows)
        result = parse_bank_statement(content, SAMPLE_REGISTRY)
        assert len(result.matched) == 0
        assert len(result.unmatched) == 1
        assert "brak dopasowania" in result.unmatched[0].reason

    def test_multiple_rows(self):
        rows = [
            ["2026-01-10", "", "", 300.0, "", "", "", "ANNA SZRAMA",
             "", "", "", "OPLATA ZA MIESZKANIE"],
            ["2026-01-12", "", "", 450.0, "", "", "", "JAN JANTZEN",
             "", "UL GDAŃSKA 58/33 STAROGARD", "", "CZYNSZ"],
            ["2026-01-15", "", "", -50.0, "", "", "", "BANK",
             "", "", "", "PROWIZJA"],
        ]
        content = _make_xls(SAMPLE_HEADERS, rows)
        result = parse_bank_statement(content, SAMPLE_REGISTRY)
        assert result.total_rows == 3
        assert len(result.matched) == 2  # dwie wpłaty > 0
        apt_numbers = {m.apartment_number for m in result.matched}
        assert "25,26" in apt_numbers  # SZRAMA
        assert "33" in apt_numbers     # JANTZEN


# ── Testy endpointu ──────────────────────────


class TestImportBankStatementEndpoint:
    def test_wrong_extension(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [
            {"id": "a1", "number": "1", "billing_surname": "TEST", "billing_group_id": None},
        ])
        resp = admin_client.post(
            "/api/import/payments-bank-statement?dry_run=true",
            files={"file": ("test.xlsx", b"content", "application/octet-stream")},
        )
        assert resp.status_code == 422
        assert ".xls" in resp.json()["detail"]

    def test_no_apartments(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [])
        content = _make_xls(SAMPLE_HEADERS, [["2026-01-01", "", "", 100, "", "", "", "A", "", "", "", "B"]])
        resp = admin_client.post(
            "/api/import/payments-bank-statement?dry_run=true",
            files={"file": ("test.xls", content, "application/vnd.ms-excel")},
        )
        assert resp.status_code == 422
        assert "lokali" in resp.json()["detail"].lower()

    def test_no_billing_surnames(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [
            {"id": "a1", "number": "1", "billing_surname": None, "billing_group_id": None},
        ])
        content = _make_xls(SAMPLE_HEADERS, [["2026-01-01", "", "", 100, "", "", "", "A", "", "", "", "B"]])
        resp = admin_client.post(
            "/api/import/payments-bank-statement?dry_run=true",
            files={"file": ("test.xls", content, "application/vnd.ms-excel")},
        )
        assert resp.status_code == 422
        assert "nazwisk" in resp.json()["detail"].lower()

    def test_dry_run_success(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [
            {"id": "a33", "number": "33", "billing_surname": "JANTZEN", "billing_group_id": None},
        ])
        rows = [
            ["2026-01-15", "", "", 500.0, "", "", "", "JAN JANTZEN",
             "", "UL GDAŃSKA 58/33", "", "CZYNSZ ZA LOKAL NR 33"],
        ]
        content = _make_xls(SAMPLE_HEADERS, rows)
        resp = admin_client.post(
            "/api/import/payments-bank-statement?dry_run=true",
            files={"file": ("zestawienie.xls", content, "application/vnd.ms-excel")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["dry_run"] is True
        assert data["matched_count"] == 1
        assert data["matched"][0]["apartment_number"] == "33"

    def test_dedup_single_apartment(self, admin_client, fake_sb):
        """Wpłata z tą samą kwotą, datą i lokalem powinna być pominięta."""
        fake_sb.set_table_data("apartments", [
            {"id": "a33", "number": "33", "billing_surname": "JANTZEN", "billing_group_id": None},
        ])
        # Symuluj istniejącą wpłatę w bazie (kwota z innym formatem: "500.00" vs "500.0")
        fake_sb.set_table_data("payments", [
            {"apartment_id": "a33", "payment_date": "2026-01-15", "amount": "500.00"},
        ])
        rows = [
            ["2026-01-15", "", "", 500.0, "", "", "", "JAN JANTZEN",
             "", "UL GDAŃSKA 58/33", "", "CZYNSZ ZA LOKAL NR 33"],
        ]
        content = _make_xls(SAMPLE_HEADERS, rows)
        resp = admin_client.post(
            "/api/import/payments-bank-statement?dry_run=true",
            files={"file": ("zestawienie.xls", content, "application/vnd.ms-excel")},
        )
        assert resp.status_code == 200
        data = resp.json()
        # Wpłata dopasowana ale oznaczona jako duplikat (przeniesiona do unmatched)
        assert data["matched_count"] == 0
        assert any("duplikat" in u.get("reason", "").lower() or "istnieje" in u.get("reason", "").lower()
                    for u in data["unmatched"])

    def test_requires_admin(self, client, fake_sb):
        """Endpoint wymaga roli admin."""
        fake_sb.auth.get_user.return_value = None
        content = _make_xls(SAMPLE_HEADERS, [])
        resp = client.post(
            "/api/import/payments-bank-statement?dry_run=true",
            files={"file": ("test.xls", content, "application/vnd.ms-excel")},
        )
        assert resp.status_code in (401, 403)
