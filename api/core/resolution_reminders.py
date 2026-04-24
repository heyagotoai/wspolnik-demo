"""Przypomnienia o nieoddanych głosach — logika wyznaczania odbiorców i okna czasowego."""

from __future__ import annotations

from datetime import date, timedelta

from api.core import resolution_voting_window
from api.core.resolution_voting_window import parse_resolution_date
from api.core.voting_eligibility import check_resolution_vote_eligibility

REMINDER_DAYS_BEFORE_END = 2


def is_within_reminder_window(
    voting_end: str | None,
    today: date | None = None,
    days_before: int = REMINDER_DAYS_BEFORE_END,
) -> bool:
    """Czy dzisiaj mieści się w oknie wysyłki przypomnień dla tej uchwały.

    Okno: `voting_end - days_before <= today <= voting_end`.
    Nie wysyłamy po dacie końca głosowania ani przed otwarciem okna.
    """
    t = today if today is not None else resolution_voting_window.local_today_pl()
    end_d = parse_resolution_date(voting_end)
    if end_d is None:
        return False
    start_window = end_d - timedelta(days=days_before)
    return start_window <= t <= end_d


def find_pending_voters(sb, resolution_id: str) -> list[dict]:
    """Zwraca listę mieszkańców uprawnionych, którzy jeszcze nie oddali głosu.

    Każdy wpis: {"resident_id", "email", "full_name"}. Pomija rekordy bez emaila.
    """
    residents_res = (
        sb.table("residents")
        .select("id, email, full_name, role, is_active")
        .eq("is_active", True)
        .execute()
    )
    residents_rows = residents_res.data or []

    votes_res = (
        sb.table("votes")
        .select("resident_id")
        .eq("resolution_id", resolution_id)
        .execute()
    )
    voted_ids = {v["resident_id"] for v in (votes_res.data or []) if v.get("resident_id")}

    pending: list[dict] = []
    for r in residents_rows:
        if not r.get("is_active"):
            continue
        email = (r.get("email") or "").strip()
        if not email:
            continue
        if r.get("id") in voted_ids:
            continue
        eligible, _ = check_resolution_vote_eligibility(sb, r["id"])
        if not eligible:
            continue
        pending.append({
            "resident_id": r["id"],
            "email": email,
            "full_name": r.get("full_name") or "",
        })

    pending.sort(key=lambda x: (x["full_name"] or "", x["email"]))
    return pending


def build_reminder_email(resolution_title: str, voting_end: str | None) -> tuple[str, str]:
    """Zwraca (subject, body) dla maila przypomnienia."""
    from api.core.email_disclaimer import PUBLIC_SITE_URL, automated_email_footer

    subject = f"[WM GABI] Przypomnienie o głosowaniu: {resolution_title}"
    end_line = (
        f"Głosowanie potrwa jeszcze do {voting_end}."
        if voting_end
        else "Głosowanie jest nadal otwarte."
    )
    body = (
        f"Dzień dobry,\n\n"
        f"przypominamy, że w panelu mieszkańca czeka na Państwa głos uchwała:\n\n"
        f"  „{resolution_title}”\n\n"
        f"{end_line} Prosimy o oddanie głosu — każdy głos ma znaczenie dla decyzji wspólnoty.\n\n"
        f"Aby zagłosować, wystarczy zalogować się do panelu mieszkańca:\n"
        f"{PUBLIC_SITE_URL}\n\n"
        f"Dziękujemy i pozdrawiamy,\n"
        f"Zarząd WM GABI\n"
        f"{automated_email_footer()}"
    )
    return subject, body
