"""Generowanie pliku PDF 'SALDO' — załącznik do powiadomienia email.

Treść i układ muszą być zgodne z wydrukiem w panelu admina
(site/src/pages/admin/ApartmentsPage.tsx).
"""

from __future__ import annotations

import io
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

import reportlab
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
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
    OVERPAYMENT_SETTLEMENT,
    PAYMENT_DUE_INTRO,
    PAYMENT_RULE,
    TRANSFER_NOTE,
    _to_pl_datetime,
    format_amount_pl,
    format_date_pl,
)

# ── Czcionki ──────────────────────────────────────────────────────────────────
# DejaVu Sans — obsługa polskich znaków, licencja Bitstream Vera / Arev
_FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"
_RL_FONTS_DIR = Path(reportlab.__file__).parent / "fonts"


def _register_fonts() -> tuple[str, str]:
    """Rejestruje czcionki i zwraca (font_regular, font_bold).

    Preferuje DejaVu (pełna obsługa polskich znaków). Fallback na Vera
    (bundled w ReportLab) jeśli DejaVu nie jest dostępne.
    """
    deja_reg = _FONTS_DIR / "DejaVuSans.ttf"
    deja_bd = _FONTS_DIR / "DejaVuSans-Bold.ttf"

    if deja_reg.exists() and deja_bd.exists():
        pdfmetrics.registerFont(TTFont("DejaVuSans", str(deja_reg)))
        pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(deja_bd)))
        pdfmetrics.registerFontFamily(
            "DejaVuSans",
            normal="DejaVuSans",
            bold="DejaVuSans-Bold",
            italic="DejaVuSans",
            boldItalic="DejaVuSans-Bold",
        )
        return "DejaVuSans", "DejaVuSans-Bold"

    # Fallback — Vera (brakuje niektórych polskich znaków, ale działa lokalnie)
    pdfmetrics.registerFont(TTFont("Vera", str(_RL_FONTS_DIR / "Vera.ttf")))
    pdfmetrics.registerFont(TTFont("VeraBd", str(_RL_FONTS_DIR / "VeraBd.ttf")))
    pdfmetrics.registerFontFamily(
        "Vera",
        normal="Vera",
        bold="VeraBd",
        italic="Vera",
        boldItalic="VeraBd",
    )
    return "Vera", "VeraBd"


_FONT_REG, _FONT_BD = _register_fonts()

LOGO_PATH = Path(__file__).parent.parent / "assets" / "logo.png"
_GREY = HexColor("#999999")
_DARK = HexColor("#333333")


# ── Budowanie PDF ──────────────────────────────────────────────────────────────

def build_saldo_pdf(
    apartment_number: str,
    balance: Decimal,
    *,
    issue_at: datetime | None = None,
) -> bytes:
    """Generuje pismo SALDO jako bajty PDF — ten sam układ co wydruk w panelu."""
    issue = _to_pl_datetime(issue_at)
    date_label = format_date_pl(issue)
    due_label = format_date_pl(issue.date() + timedelta(days=14))
    amt = format_amount_pl(balance)

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

    story = []

    # ── Nagłówek: logo | dane wspólnoty | data ────────────────────────────────
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

    # Szerokość treści: 210 - 20 - 20 = 170 mm
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

    # ── Tytuł ─────────────────────────────────────────────────────────────────
    story.append(Paragraph(
        "SALDO",
        st("title", fontName=_FONT_BD, fontSize=16, leading=20, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 8 * mm))

    # ── Treść główna ──────────────────────────────────────────────────────────
    story.append(Paragraph(
        f"{COMMUNITY_NAME} informuje, iż dla lokalu nr <b>{apartment_number}</b> "
        f"stan konta na dzień <b>{date_label}</b> wynosi: <b>{amt}</b>.",
        st("body", fontSize=11, leading=16, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 8 * mm))

    # ── Separator ─────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=_GREY, spaceAfter=6 * mm))

    # ── Blok warunkowy (zadłużenie / nadpłata) ────────────────────────────────
    if balance < 0:
        story.append(Paragraph(
            f"{PAYMENT_DUE_INTRO} <b>{due_label}</b>",
            st("due", fontSize=10, leading=14, alignment=TA_CENTER),
        ))
        story.append(Spacer(1, 6 * mm))
    elif balance > 0:
        story.append(Paragraph(
            OVERPAYMENT_SETTLEMENT,
            st("ovp", fontSize=10, leading=14, alignment=TA_CENTER),
        ))
        story.append(Spacer(1, 6 * mm))

    # ── Reguła płatności ──────────────────────────────────────────────────────
    story.append(Paragraph(
        PAYMENT_RULE,
        st("prule", fontSize=10, leading=14, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 4 * mm))

    # ── Numer konta ───────────────────────────────────────────────────────────
    story.append(Paragraph(
        BANK_ACCOUNT_FORMATTED,
        st("bank", fontName=_FONT_BD, fontSize=12, leading=16, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 4 * mm))

    # ── Nota przelewu ─────────────────────────────────────────────────────────
    story.append(Paragraph(
        TRANSFER_NOTE,
        st("note", fontSize=9, leading=12, alignment=TA_CENTER, textColor=_GREY),
    ))

    doc.build(story)
    return buf.getvalue()
