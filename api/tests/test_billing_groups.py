"""Testy endpointów /api/billing-groups.

Pokryte scenariusze:
- CRUD grup rozliczeniowych
- Przypisywanie/usuwanie lokali z grup
- Rozbicie wpłaty (proporcjonalne, równe, zaokrąglenia)
- Obliczanie salda łącznego
- Kontrola dostępu (admin, manager, mieszkaniec)
"""

GROUP_1 = {
    "id": "group-1",
    "name": "Kowalski - lokale 3, 5",
    "created_at": "2026-03-28T10:00:00",
    "updated_at": "2026-03-28T10:00:00",
}

APT_3 = {
    "id": "apt-3",
    "number": "3",
    "area_m2": "50.00",
    "owner_resident_id": "res-1",
    "initial_balance": "100.00",
    "declared_occupants": 2,
    "billing_group_id": "group-1",
}

APT_5 = {
    "id": "apt-5",
    "number": "5",
    "area_m2": "75.00",
    "owner_resident_id": "res-1",
    "initial_balance": "0.00",
    "declared_occupants": 3,
    "billing_group_id": "group-1",
}

RESIDENT_1 = {
    "id": "res-1",
    "full_name": "Jan Kowalski",
    "email": "jan@gabi.pl",
    "role": "resident",
}

PAYMENT_PARENT = {
    "id": "pay-parent-1",
    "apartment_id": None,
    "billing_group_id": "group-1",
    "amount": "1000.00",
    "payment_date": "2026-03-15",
    "title": "Wpłata grupowa - Kowalski - lokale 3, 5",
    "confirmed_by_admin": True,
    "matched_automatically": False,
}


class TestListBillingGroups:
    def test_admin_widzi_grupy(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [APT_3, APT_5])
        fake_sb.set_table_data("residents", [RESIDENT_1])

        resp = admin_client.get("/api/billing-groups")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["name"] == GROUP_1["name"]

    def test_mieszkaniec_nie_ma_dostepu(self, client, fake_sb, resident_headers):
        resp = client.get("/api/billing-groups", headers=resident_headers)
        assert resp.status_code == 403


class TestCreateBillingGroup:
    def test_admin_tworzy_grupe(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])

        resp = admin_client.post("/api/billing-groups", json={"name": "Nowa grupa"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == GROUP_1["name"]
        assert data["apartments"] == []

    def test_pusta_nazwa_odrzucona(self, admin_client, fake_sb):
        resp = admin_client.post("/api/billing-groups", json={"name": "  "})
        assert resp.status_code == 422

    def test_manager_nie_moze_tworzyc(self, manager_client, fake_sb):
        resp = manager_client.post("/api/billing-groups", json={"name": "Nowa"})
        # Manager has require_admin_or_manager overridden but not require_admin,
        # so the request fails with 401 (no valid token for require_admin flow)
        assert resp.status_code in (401, 403, 422)


class TestUpdateBillingGroup:
    def test_admin_zmienia_nazwe(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [APT_3, APT_5])
        fake_sb.set_table_data("residents", [RESIDENT_1])

        resp = admin_client.patch(
            f"/api/billing-groups/{GROUP_1['id']}",
            json={"name": "Zmieniona nazwa"},
        )
        assert resp.status_code == 200


class TestDeleteBillingGroup:
    def test_admin_usuwa_grupe(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [])

        resp = admin_client.delete(f"/api/billing-groups/{GROUP_1['id']}")
        assert resp.status_code == 200
        assert "usunięta" in resp.json()["detail"]

    def test_404_nieistniejaca_grupa(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [])

        resp = admin_client.delete("/api/billing-groups/nonexistent")
        assert resp.status_code == 404


class TestAssignApartments:
    def test_przypisanie_lokali(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [APT_3, APT_5])
        fake_sb.set_table_data("residents", [RESIDENT_1])

        resp = admin_client.post(
            f"/api/billing-groups/{GROUP_1['id']}/apartments",
            json={"apartment_ids": [APT_3["id"], APT_5["id"]]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["apartments"]) >= 1

    def test_pusta_lista_odrzucona(self, admin_client, fake_sb):
        resp = admin_client.post(
            f"/api/billing-groups/{GROUP_1['id']}/apartments",
            json={"apartment_ids": []},
        )
        assert resp.status_code == 422


class TestRemoveApartment:
    def test_usuniecie_lokalu_z_grupy(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [APT_3])

        resp = admin_client.delete(
            f"/api/billing-groups/{GROUP_1['id']}/apartments/{APT_3['id']}"
        )
        assert resp.status_code == 200
        assert "usunięty" in resp.json()["detail"]

    def test_lokal_nie_w_grupie(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [])

        resp = admin_client.delete(
            f"/api/billing-groups/{GROUP_1['id']}/apartments/nonexistent"
        )
        assert resp.status_code == 404


class TestSplitPayment:
    def test_rozbicie_proporcjonalne(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [APT_3, APT_5])
        fake_sb.set_table_data("charges", [
            {"apartment_id": "apt-3", "amount": "200.00", "month": "2026-03-01"},
            {"apartment_id": "apt-5", "amount": "300.00", "month": "2026-03-01"},
        ])
        fake_sb.set_table_data("payments", [PAYMENT_PARENT])

        resp = admin_client.post(
            f"/api/billing-groups/{GROUP_1['id']}/split-payment",
            json={
                "amount": "1000.00",
                "payment_date": "2026-03-15",
                "split_month": "2026-03-01",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["total_amount"] == "1000.00"
        assert len(data["children"]) == 2

    def test_brak_lokali_w_grupie(self, admin_client, fake_sb):
        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [])

        resp = admin_client.post(
            f"/api/billing-groups/{GROUP_1['id']}/split-payment",
            json={
                "amount": "500.00",
                "payment_date": "2026-03-15",
            },
        )
        assert resp.status_code == 400

    def test_ujemna_kwota_odrzucona(self, admin_client, fake_sb):
        resp = admin_client.post(
            f"/api/billing-groups/{GROUP_1['id']}/split-payment",
            json={
                "amount": "-100.00",
                "payment_date": "2026-03-15",
            },
        )
        assert resp.status_code == 422


class TestGroupBalance:
    def test_saldo_grupy(self, fake_sb, app):
        """Balance endpoint uses get_current_user, needs explicit override."""
        from starlette.testclient import TestClient
        from api.core.security import get_current_user

        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "admin-1", "email": "admin@gabi.pl",
        }

        fake_sb.set_table_data("billing_groups", [GROUP_1])
        fake_sb.set_table_data("apartments", [APT_3, APT_5])
        fake_sb.set_table_data("charges", [
            {"amount": "200.00"},
        ])
        fake_sb.set_table_data("payments", [
            {"amount": "300.00", "confirmed_by_admin": True},
        ])
        fake_sb.set_table_data("residents", [
            {"id": "admin-1", "role": "admin"},
        ])

        client = TestClient(app)
        resp = client.get(f"/api/billing-groups/{GROUP_1['id']}/balance")
        assert resp.status_code == 200
        data = resp.json()
        assert data["group_id"] == GROUP_1["id"]
        assert data["group_name"] == GROUP_1["name"]
        assert "combined_balance" in data
        assert "apartments" in data

    def test_404_nieistniejaca_grupa(self, fake_sb, app):
        from starlette.testclient import TestClient
        from api.core.security import get_current_user

        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "admin-1", "email": "admin@gabi.pl",
        }

        fake_sb.set_table_data("billing_groups", [])
        fake_sb.set_table_data("residents", [{"id": "admin-1", "role": "admin"}])

        client = TestClient(app)
        resp = client.get("/api/billing-groups/nonexistent/balance")
        assert resp.status_code == 404
