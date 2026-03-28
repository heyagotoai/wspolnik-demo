"""Testy jednostkowe api.core.payment_split."""

from decimal import Decimal

from api.core.payment_split import compute_split_amounts


class TestComputeSplitAmounts:
    def test_jeden_lokal(self):
        out = compute_split_amounts(["a"], {"a": Decimal("100")}, Decimal("99.99"))
        assert out == {"a": Decimal("99.99")}

    def test_rowny_podzial_bez_wag(self):
        out = compute_split_amounts(
            ["a", "b"],
            {"a": Decimal("0"), "b": Decimal("0")},
            Decimal("100.00"),
        )
        assert out["a"] == Decimal("50.00")
        assert out["b"] == Decimal("50.00")

    def test_proporcje_z_naliczen(self):
        out = compute_split_amounts(
            ["a", "b"],
            {"a": Decimal("200"), "b": Decimal("300")},
            Decimal("100.00"),
        )
        assert out["a"] == Decimal("40.00")
        assert out["b"] == Decimal("60.00")

    def test_pusta_lista(self):
        assert compute_split_amounts([], {}, Decimal("10")) == {}
