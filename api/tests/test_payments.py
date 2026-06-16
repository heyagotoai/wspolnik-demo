"""Testy ręcznej korekty wpłat — /api/payments.

Pokrycie:
- GET    /api/payments?apartment_id=  — lista wpłat lokalu (admin)
- POST   /api/payments                — ręczne dodanie wpłaty (admin)
- PATCH  /api/payments/:id            — edycja / przeniesienie do innego lokalu
- DELETE /api/payments/:id            — usunięcie (z kaskadą dla rozbicia)
"""


def _payment_row(**over):
    base = {
        "id": "pay-1",
        "apartment_id": "apt-1",
        "billing_group_id": None,
        "amount": "150.00",
        "payment_date": "2026-05-10",
        "title": "Wpłata z zestawienia bankowego",
        "confirmed_by_admin": True,
        "matched_automatically": True,
        "parent_payment_id": None,
        "created_at": "2026-05-10T08:00:00Z",
    }
    base.update(over)
    return base


# --- GET /api/payments -------------------------------------------------------

class TestListPayments:
    def test_returns_payments_for_apartment(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row()])
        resp = admin_client.get("/api/payments?apartment_id=apt-1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "pay-1"
        assert data[0]["amount"] == "150.00"

    def test_requires_apartment_id(self, admin_client):
        resp = admin_client.get("/api/payments")
        assert resp.status_code == 422


# --- POST /api/payments ------------------------------------------------------

class TestCreatePayment:
    def test_create_manual_payment(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [{"id": "apt-1", "billing_group_id": "bg-1"}])
        # Preset odpowiedzi insertu (FakeSupabase zwraca pre-set data)
        fake_sb.set_table_data("payments", [_payment_row(
            title="Wpłata gotówkowa", matched_automatically=False, billing_group_id="bg-1",
        )])
        resp = admin_client.post("/api/payments", json={
            "apartment_id": "apt-1",
            "amount": "150.00",
            "payment_date": "2026-05-10",
            "title": "Wpłata gotówkowa",
        })
        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == "Wpłata gotówkowa"
        assert body["matched_automatically"] is False

    def test_create_unknown_apartment_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [])
        resp = admin_client.post("/api/payments", json={
            "apartment_id": "ghost",
            "amount": "10.00",
            "payment_date": "2026-05-10",
        })
        assert resp.status_code == 404

    def test_create_rejects_zero_amount(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [{"id": "apt-1", "billing_group_id": None}])
        resp = admin_client.post("/api/payments", json={
            "apartment_id": "apt-1",
            "amount": "0",
            "payment_date": "2026-05-10",
        })
        assert resp.status_code == 422

    def test_create_rejects_bad_date(self, admin_client, fake_sb):
        fake_sb.set_table_data("apartments", [{"id": "apt-1", "billing_group_id": None}])
        resp = admin_client.post("/api/payments", json={
            "apartment_id": "apt-1",
            "amount": "10.00",
            "payment_date": "10.05.2026",
        })
        assert resp.status_code == 422

    def test_create_requires_auth(self, client):
        resp = client.post("/api/payments", json={
            "apartment_id": "apt-1",
            "amount": "10.00",
            "payment_date": "2026-05-10",
        })
        assert resp.status_code in (401, 403)


# --- PATCH /api/payments/:id -------------------------------------------------

class TestUpdatePayment:
    def test_edit_amount_and_date(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row()])
        resp = admin_client.patch("/api/payments/pay-1", json={
            "amount": "200.00",
            "payment_date": "2026-05-12",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["amount"] == "200.00"
        assert body["payment_date"] == "2026-05-12"

    def test_reassign_to_other_apartment(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row(apartment_id="apt-1")])
        # Lokal docelowy z własną grupą rozliczeniową
        fake_sb.set_table_data("apartments", [{"id": "apt-2", "billing_group_id": "bg-2"}])
        resp = admin_client.patch("/api/payments/pay-1", json={"apartment_id": "apt-2"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["apartment_id"] == "apt-2"
        assert body["billing_group_id"] == "bg-2"

    def test_reassign_unknown_apartment_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row()])
        fake_sb.set_table_data("apartments", [])
        resp = admin_client.patch("/api/payments/pay-1", json={"apartment_id": "ghost"})
        assert resp.status_code == 404

    def test_split_child_blocked(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row(parent_payment_id="par-1")])
        resp = admin_client.patch("/api/payments/pay-1", json={"amount": "99.00"})
        assert resp.status_code == 409

    def test_split_parent_blocked(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row(apartment_id=None)])
        resp = admin_client.patch("/api/payments/pay-1", json={"amount": "99.00"})
        assert resp.status_code == 409

    def test_empty_body_400(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row()])
        resp = admin_client.patch("/api/payments/pay-1", json={})
        assert resp.status_code == 400

    def test_not_found_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [])
        resp = admin_client.patch("/api/payments/ghost", json={"amount": "10.00"})
        assert resp.status_code == 404


# --- DELETE /api/payments/:id ------------------------------------------------

class TestDeletePayment:
    def test_delete_simple(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row()])
        resp = admin_client.delete("/api/payments/pay-1")
        assert resp.status_code == 200
        assert "usunięta" in resp.json()["detail"].lower()

    def test_delete_split_child_removes_parent(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [_payment_row(parent_payment_id="par-1")])
        resp = admin_client.delete("/api/payments/pay-1")
        assert resp.status_code == 200
        assert "rozbiciami" in resp.json()["detail"].lower()

    def test_delete_not_found_404(self, admin_client, fake_sb):
        fake_sb.set_table_data("payments", [])
        resp = admin_client.delete("/api/payments/ghost")
        assert resp.status_code == 404

    def test_delete_requires_auth(self, client):
        resp = client.delete("/api/payments/pay-1")
        assert resp.status_code in (401, 403)
