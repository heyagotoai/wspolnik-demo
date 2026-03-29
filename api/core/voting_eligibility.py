"""Kto może głosować w uchwałach — rola + ewentualnie własność lokalu."""

from __future__ import annotations


def check_resolution_vote_eligibility(sb, user_id: str) -> tuple[bool, str | None]:
    """Zwraca (True, None) jeśli użytkownik może głosować; w przeciwnym razie (False, komunikat na 403)."""
    voter = (
        sb.table("residents")
        .select("role, is_active")
        .eq("id", user_id)
        .execute()
    )
    if not voter.data:
        return False, "Brak uprawnień do głosowania — konto nie jest przypisane do mieszkańca."
    vrow = voter.data[0]
    if not vrow.get("is_active", True):
        return False, "Brak uprawnień do głosowania — konto jest nieaktywne."
    role = vrow.get("role")
    if role == "resident":
        return True, None
    if role in ("admin", "manager"):
        owned = (
            sb.table("apartments")
            .select("id")
            .eq("owner_resident_id", user_id)
            .limit(1)
            .execute()
        )
        if owned.data:
            return True, None
        return (
            False,
            "Głosować jako administrator lub zarządca możesz tylko, jeśli jesteś właścicielem lokalu "
            "(w zakładce Lokale przypisany jako właściciel).",
        )
    return False, "Brak uprawnień do głosowania."
