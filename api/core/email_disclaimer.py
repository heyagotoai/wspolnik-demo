"""Wspólne stopki dla wiadomości e-mail wysyłanych przez system."""

PUBLIC_CONTACT_URL = "https://wmgabi.pl/kontakt"
PUBLIC_SITE_URL = "https://wmgabi.pl"


def automated_email_footer() -> str:
    """Stopka dla maili do mieszkańców i powiadomień systemowych (np. backup)."""
    return (
        "\n\n---\n"
        "Ta wiadomość została wygenerowana automatycznie — prosimy nie odpowiadać na tego maila.\n"
        "W sprawach dotyczących wspólnoty wypełnij formularz kontaktowy na stronie:\n"
        f"{PUBLIC_CONTACT_URL}\n"
    )


def contact_form_relay_footer() -> str:
    """Stopka dla przekazania z formularza kontaktowego na adres administratora."""
    return (
        "\n\n---\n"
        "Ta wiadomość została wygenerowana automatycznie przez system WM GABI.\n"
        "Aby odpowiedzieć nadawcy, użyj funkcji „Odpowiedz” w programie pocztowym "
        "(adres zwrotny wskazuje na skrzynkę zgłaszającego).\n"
    )
