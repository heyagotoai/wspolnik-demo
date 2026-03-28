"""Wspólna logika rozbicia kwoty wpłaty na wiele lokali (proporcje lub równo)."""

from decimal import Decimal, ROUND_HALF_UP


def compute_split_amounts(
    apartment_ids: list[str],
    weight_by_apartment: dict[str, Decimal],
    total_amount: Decimal,
) -> dict[str, Decimal]:
    """
    Rozdziel total_amount na lokale wg wag (np. sumy naliczeń w miesiącu).
    Gdy suma wag = 0 — podział równy.
    Przedostatnie kwoty zaokrąglane do groszy; ostatni lokal dostaje resztę (brak dryfu PLN).
    """
    if not apartment_ids:
        return {}
    if len(apartment_ids) == 1:
        aid = apartment_ids[0]
        return {aid: total_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)}

    total_weight = sum(weight_by_apartment.get(aid, Decimal("0")) for aid in apartment_ids)
    if total_weight > 0:
        proportions = {
            aid: weight_by_apartment.get(aid, Decimal("0")) / total_weight for aid in apartment_ids
        }
    else:
        n = len(apartment_ids)
        proportions = {aid: Decimal("1") / Decimal(str(n)) for aid in apartment_ids}

    split_amounts: dict[str, Decimal] = {}
    running_sum = Decimal("0")
    apt_list = list(apartment_ids)

    for i, aid in enumerate(apt_list):
        if i == len(apt_list) - 1:
            split_amounts[aid] = total_amount - running_sum
        else:
            amt = (total_amount * proportions[aid]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            split_amounts[aid] = amt
            running_sum += amt

    return split_amounts
