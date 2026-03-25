"""Generowanie pliku PDF 'ZAWIADOMIENIE' — informacja o opłatach miesięcznych.

Struktura wzorowana na oficjalnym zawiadomieniu wspólnoty:
nagłówek → tytuł → podstawa prawna → tabela opłat → data obowiązywania
→ instrukcja płatności → numer konta.
"""

from __future__ import annotations

import io
from datetime import datetime
from decimal import Decimal
from pathlib import Path

import reportlab
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from api.core.saldo_letter import (
    BANK_ACCOUNT_FORMATTED,
    COMMUNITY_CITY,
    COMMUNITY_NAME,
    COMMUNITY_PLACE_LINE,
    COMMUNITY_STREET,
    TRANSFER_NOTE,
    _to_pl_datetime,
    format_amount_pl,
    format_date_pl,
)

# ── Czcionki ──────────────────────────────────────────────────────────────────
_FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"
_RL_FONTS_DIR = Path(reportlab.__file__).parent / "fonts"


def _register_fonts() -> tuple[str, str]:
    """Rejestruje czcionki i zwraca (font_regular, font_bold)."""
    deja_reg = _FONTS_DIR / "DejaVuSans.ttf"
    deja_bd = _FONTS_DIR / "DejaVuSans-Bold.ttf"

    if deja_reg.exists() and deja_bd.exists():
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans", str(deja_reg)))
        except KeyError:
            pass  # already registered
        try:
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(deja_bd)))
        except KeyError:
            pass
        try:
            pdfmetrics.registerFontFamily(
                "DejaVuSans",
                normal="DejaVuSans",
                bold="DejaVuSans-Bold",
                italic="DejaVuSans",
                boldItalic="DejaVuSans-Bold",
            )
        except Exception:
            pass
        return "DejaVuSans", "DejaVuSans-Bold"

    # Fallback — Vera
    try:
        pdfmetrics.registerFont(TTFont("Vera", str(_RL_FONTS_DIR / "Vera.ttf")))
        pdfmetrics.registerFont(TTFont("VeraBd", str(_RL_FONTS_DIR / "VeraBd.ttf")))
        pdfmetrics.registerFontFamily(
            "Vera", normal="Vera", bold="VeraBd", italic="Vera", boldItalic="VeraBd",
        )
    except Exception:
        pass
    return "Vera", "VeraBd"


_FONT_REG, _FONT_BD = _register_fonts()

LOGO_PATH = Path(__file__).parent.parent / "assets" / "logo.png"
_GREY = HexColor("#999999")
_DARK = HexColor("#333333")

# Etykiety typów opłat (formalne, pełne nazwy)
ZAWIADOMIENIE_TYPE_LABELS: dict[str, str] = {
    "eksploatacja": "Opłata eksploatacyjna",
    "fundusz_remontowy": "Fundusz remontowy",
    "smieci": "Wywóz nieczystości stałych",
}

PAYMENT_INSTRUCTION = (
    "Wpłatę prosimy uiszczać do 15 dnia każdego miesiąca, "
    "na rachunek bankowy nr:"
)

TRANSFER_NOTE_ZAWIADOMIENIE = (
    "Przy wpłacie proszę podać nazwisko właściciela i nr lokalu"
)


# ── Budowanie PDF ─────────────────────────────────────────────────────────────

def build_zawiadomienie_pdf(
    apartment_number: str,
    charges_breakdown: list[dict],
    total: Decimal,
    valid_from_label: str,
    legal_basis: str,
    *,
    issue_at: datetime | None = None,
) -> bytes:
    """Generuje zawiadomienie o opłatach jako bajty PDF.

    Args:
        apartment_number: Numer lokalu.
        charges_breakdown: Lista dict z kluczami "label" (str) i "amount" (Decimal).
        total: Suma opłat.
        valid_from_label: Etykieta daty obowiązywania, np. "12.2025".
        legal_basis: Tekst podstawy prawnej.
        issue_at: Data wystawienia (domyślnie teraz).
    """
    issue = _to_pl_datetime(issue_at)
    date_label = format_date_pl(issue)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=20 * mm,
    )

    def st(name: str, **kw) -> ParagraphStyle:
        kw.setdefault("fontName", _FONT_REG)
        return ParagraphStyle(name, **kw)

    story: list = []

    # ── Nagłówek: logo | dane wspólnoty | data ─────────────────────────────
    from reportlab.platypus import Image

    logo_cell: list = (
        [Image(str(LOGO_PATH), width=15 * mm, height=15 * mm)]
        if LOGO_PATH.exists()
        else [Paragraph("", st("logo_empty", fontSize=1))]
    )

    community_col = [
        Paragraph(COMMUNITY_NAME, st("hN", fontName=_FONT_BD, fontSize=10, leading=13)),
        Paragraph(COMMUNITY_CITY, st("hC", fontSize=9, leading=12, textColor=_DARK)),
        Paragraph(COMMUNITY_STREET, st("hS", fontSize=9, leading=12, textColor=_DARK)),
    ]

    date_col = [
        Paragraph(
            f"{COMMUNITY_PLACE_LINE}, {date_label}",
            st("hD", fontSize=9, leading=12, alignment=TA_RIGHT),
        )
    ]

    hdr = Table(
        [[logo_cell, community_col, date_col]],
        colWidths=[17 * mm, 113 * mm, 40 * mm],
    )
    hdr.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(hdr)
    story.append(Spacer(1, 10 * mm))

    # ── Tytuł ───────────────────────────────────────────────────────────────
    story.append(Paragraph(
        "ZAWIADOMIENIE",
        st("title", fontName=_FONT_BD, fontSize=16, leading=20, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 6 * mm))

    # ── Podstawa prawna ─────────────────────────────────────────────────────
    story.append(Paragraph(
        legal_basis,
        st("legal", fontSize=10, leading=14, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 6 * mm))

    # ── Tabela opłat ────────────────────────────────────────────────────────
    table_data = []

    # Wiersz: "Dla lokalu nr X"
    table_data.append([
        Paragraph("Dla lokalu nr", st("tl", fontSize=10, leading=13)),
        Paragraph(f"<b>{apartment_number}</b>", st("tr", fontName=_FONT_BD, fontSize=10, leading=13, alignment=TA_RIGHT)),
    ])

    # Wiersze opłat
    for item in charges_breakdown:
        table_data.append([
            Paragraph(item["label"], st(f"tl_{item['label'][:4]}", fontSize=10, leading=13)),
            Paragraph(
                format_amount_pl(item["amount"]),
                st(f"tr_{item['label'][:4]}", fontSize=10, leading=13, alignment=TA_RIGHT),
            ),
        ])

    # Wiersz sumy
    table_data.append([
        Paragraph("ŁĄCZNIE DO ZAPŁATY", st("tl_total", fontName=_FONT_BD, fontSize=10, leading=13)),
        Paragraph(
            f"<b>{format_amount_pl(total)}</b>",
            st("tr_total", fontName=_FONT_BD, fontSize=10, leading=13, alignment=TA_RIGHT),
        ),
    ])

    charges_table = Table(table_data, colWidths=[100 * mm, 60 * mm])

    # Indeks wiersza sumy (ostatni)
    total_row = len(table_data) - 1

    charges_table.setStyle(TableStyle([
        # Ramka zewnętrzna
        ("BOX", (0, 0), (-1, -1), 1, _DARK),
        # Siatka wewnętrzna — linie poziome
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, _GREY),
        # Grubsza linia nad sumą
        ("LINEABOVE", (0, total_row), (-1, total_row), 1.5, _DARK),
        # Padding
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Wyrównanie
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(charges_table)
    story.append(Spacer(1, 8 * mm))

    # ── Data obowiązywania ──────────────────────────────────────────────────
    story.append(Paragraph(
        f"Opłaty naliczane są od miesiąca {valid_from_label}",
        st("valid_from", fontSize=10, leading=14, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 8 * mm))

    # ── Instrukcja płatności ────────────────────────────────────────────────
    story.append(Paragraph(
        PAYMENT_INSTRUCTION,
        st("pay_instr", fontSize=10, leading=14, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 4 * mm))

    # ── Numer konta ─────────────────────────────────────────────────────────
    story.append(Paragraph(
        BANK_ACCOUNT_FORMATTED,
        st("bank", fontName=_FONT_BD, fontSize=12, leading=16, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 4 * mm))

    # ── Nota przelewu ───────────────────────────────────────────────────────
    story.append(Paragraph(
        TRANSFER_NOTE_ZAWIADOMIENIE,
        st("note", fontSize=9, leading=12, alignment=TA_CENTER, textColor=_GREY),
    ))

    doc.build(story)
    return buf.getvalue()
