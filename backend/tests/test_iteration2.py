"""Iteration 2: Access control, budget CRUD, templates, settings tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "ingobiosport@gmail.com", "password": "Fikirizm2025!"}
MEMBER = {"email": "mert@fikirizm.com", "password": "Demo2025!"}      # role: member
ADMIN = {"email": "elif@fikirizm.com", "password": "Demo2025!"}       # role: admin


def _client(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed {creds['email']}: {r.text}"
    tok = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def owner_c():
    return _client(OWNER)


@pytest.fixture(scope="session")
def member_c():
    return _client(MEMBER)


@pytest.fixture(scope="session")
def admin_c():
    return _client(ADMIN)


@pytest.fixture(scope="session")
def owner_boot(owner_c):
    return owner_c.get(f"{API}/bootstrap").json()


@pytest.fixture(scope="session")
def member_boot(member_c):
    return member_c.get(f"{API}/bootstrap").json()


def _find_project(projs, name_sub):
    return next((p for p in projs if name_sub.lower() in p["name"].lower()), None)


# ------- ACCESS CONTROL -------
class TestAccessControl:
    def test_owner_sees_all_four_projects(self, owner_boot):
        names = [p["name"] for p in owner_boot["projects"]]
        assert len(owner_boot["projects"]) >= 4, f"expected >=4, got {names}"
        assert any("Operasyon" in n for n in names)
        assert any("Bisiklet Festivali" in n for n in names)

    def test_member_does_not_see_operasyon(self, member_boot):
        names = [p["name"] for p in member_boot["projects"]]
        assert not any("Operasyon" in n for n in names), f"member sees Operasyon: {names}"
        # But should see festival + others where member
        assert any("Bisiklet Festivali" in n for n in names)

    def test_member_403_on_restricted_project_tasks(self, owner_boot, member_c):
        op = _find_project(owner_boot["projects"], "Operasyon")
        assert op is not None
        r = member_c.get(f"{API}/tasks", params={"project_id": op["id"]})
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"

    def test_member_403_on_restricted_project_budget(self, owner_boot, member_c):
        op = _find_project(owner_boot["projects"], "Operasyon")
        r = member_c.get(f"{API}/projects/{op['id']}/budget")
        assert r.status_code == 403


# ------- BUDGET VIEW & CRUD -------
class TestBudget:
    def test_festival_budget_seeded(self, owner_c, owner_boot):
        fest = _find_project(owner_boot["projects"], "Bisiklet Festivali")
        assert fest is not None
        r = owner_c.get(f"{API}/projects/{fest['id']}/budget")
        assert r.status_code == 200
        d = r.json()
        assert d["currency"] == "TRY"
        assert len(d["items"]) >= 10, f"expected >=10 items, got {len(d['items'])}"
        assert d["can_edit"] is True
        assert d["policy"] == "members"
        s = d["summary"]
        for k in ("planned_income", "actual_income", "planned_expense",
                  "actual_expense", "planned_balance", "actual_balance", "by_category"):
            assert k in s
        assert isinstance(s["by_category"], list) and len(s["by_category"]) > 0

    def test_member_can_view_and_edit_festival_budget(self, member_c, member_boot):
        fest = _find_project(member_boot["projects"], "Bisiklet Festivali")
        r = member_c.get(f"{API}/projects/{fest['id']}/budget")
        assert r.status_code == 200
        assert r.json()["can_edit"] is True  # policy=members

    def test_budget_crud_flow(self, owner_c, owner_boot):
        fest = _find_project(owner_boot["projects"], "Bisiklet Festivali")
        payload = {"type": "expense", "category": "Mekan", "description": "TEST_kiralama",
                   "planned_amount": 5000, "actual_amount": 4500, "date": "2026-03-15"}
        r = owner_c.post(f"{API}/projects/{fest['id']}/budget", json=payload)
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["category"] == "Mekan"
        assert item["planned_amount"] == 5000
        bid = item["id"]

        # verify in list
        lst = owner_c.get(f"{API}/projects/{fest['id']}/budget").json()
        assert any(x["id"] == bid for x in lst["items"])

        # patch
        r = owner_c.patch(f"{API}/budget/{bid}", json={"actual_amount": 4800})
        assert r.status_code == 200
        assert r.json()["actual_amount"] == 4800

        # delete
        r = owner_c.delete(f"{API}/budget/{bid}")
        assert r.status_code == 200
        lst = owner_c.get(f"{API}/projects/{fest['id']}/budget").json()
        assert not any(x["id"] == bid for x in lst["items"])


# ------- BUDGET PERMISSION (admins-only) -------
class TestBudgetPermission:
    def test_member_view_urun_but_cannot_edit(self, member_c, member_boot):
        urun = _find_project(member_boot["projects"], "Ürün Geliştirme")
        assert urun is not None
        r = member_c.get(f"{API}/projects/{urun['id']}/budget")
        assert r.status_code == 200
        d = r.json()
        assert d["policy"] == "admins"
        assert d["can_edit"] is False

    def test_member_post_urun_budget_403(self, member_c, member_boot):
        urun = _find_project(member_boot["projects"], "Ürün Geliştirme")
        r = member_c.post(f"{API}/projects/{urun['id']}/budget",
                          json={"type": "expense", "category": "Genel Gider",
                                "description": "TEST_forbidden", "planned_amount": 100})
        assert r.status_code == 403

    def test_owner_can_post_urun_budget(self, owner_c, owner_boot):
        urun = _find_project(owner_boot["projects"], "Ürün Geliştirme")
        r = owner_c.post(f"{API}/projects/{urun['id']}/budget",
                        json={"type": "income", "category": "Bütçe",
                              "description": "TEST_owner_add", "planned_amount": 1000})
        assert r.status_code == 200
        bid = r.json()["id"]
        owner_c.delete(f"{API}/budget/{bid}")


# ------- TEMPLATES -------
class TestProjectTemplates:
    def test_bootstrap_exposes_templates(self, owner_boot):
        t = owner_boot.get("templates", {})
        assert set(t.keys()) >= {"general", "event", "camp"}
        assert "label" in t["event"]

    def test_create_event_project_usd(self, owner_c, owner_boot):
        ws_id = owner_boot["workspaces"][0]["id"]
        r = owner_c.post(f"{API}/projects", json={
            "workspace_id": ws_id, "name": "TEST_event_project",
            "template": "event", "currency": "USD", "budget_policy": "members", "members": []
        })
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["template"] == "event"
        assert p["currency"] == "USD"
        status_ids = [s["id"] for s in p["statuses"]]
        assert set(status_ids) == {"planlama", "hazirlik", "uygulama", "tamamlandi"}
        # event budget categories
        cats = p["budget_categories"]
        assert "Sponsorluk" in cats["income"]
        assert "Mekan" in cats["expense"]
        # budget endpoint reflects currency
        b = owner_c.get(f"{API}/projects/{p['id']}/budget").json()
        assert b["currency"] == "USD"
        # cleanup
        owner_c.delete(f"{API}/projects/{p['id']}")

    def test_create_camp_project(self, owner_c, owner_boot):
        ws_id = owner_boot["workspaces"][0]["id"]
        r = owner_c.post(f"{API}/projects", json={
            "workspace_id": ws_id, "name": "TEST_camp_project",
            "template": "camp", "currency": "EUR"
        })
        assert r.status_code == 200
        p = r.json()
        assert set(s["id"] for s in p["statuses"]) == {"planlama", "kayit", "devam", "tamamlandi"}
        assert "Konaklama" in p["budget_categories"]["expense"]
        owner_c.delete(f"{API}/projects/{p['id']}")


# ------- PROJECT SETTINGS (update) -------
class TestProjectSettings:
    def test_owner_can_update_members_currency_policy(self, owner_c, owner_boot):
        # create a temp project first
        ws_id = owner_boot["workspaces"][0]["id"]
        r = owner_c.post(f"{API}/projects", json={
            "workspace_id": ws_id, "name": "TEST_settings_proj",
            "template": "general", "currency": "TRY", "members": []
        })
        pid = r.json()["id"]

        # find a member to add
        mert = next(m for m in owner_boot["members"] if m["email"] == "mert@fikirizm.com")
        r = owner_c.patch(f"{API}/projects/{pid}", json={
            "members": [mert["user_id"]], "currency": "USD", "budget_policy": "members"
        })
        assert r.status_code == 200
        d = r.json()
        assert d["currency"] == "USD"
        assert d["budget_policy"] == "members"
        assert mert["user_id"] in d["members"]

        # cleanup
        owner_c.delete(f"{API}/projects/{pid}")

    def test_member_cannot_change_members_or_policy(self, member_c, member_boot, owner_c, owner_boot):
        # use festival where member has access
        fest = _find_project(member_boot["projects"], "Bisiklet Festivali")
        original = next(p for p in owner_boot["projects"] if p["id"] == fest["id"])
        r = member_c.patch(f"{API}/projects/{fest['id']}",
                           json={"members": [], "budget_policy": "admins"})
        # endpoint strips priv-only fields for non-privileged; should still 200 but ignore
        assert r.status_code == 200
        d = r.json()
        # members should still contain original set (not emptied)
        assert set(d["members"]) == set(original["members"])
        assert d["budget_policy"] == original.get("budget_policy", "members")


# ------- REGRESSION -------
class TestRegression:
    def test_dashboard_status_distribution_is_list(self, owner_c):
        r = owner_c.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["status_distribution"], list)
        if d["status_distribution"]:
            item = d["status_distribution"][0]
            assert {"name", "value", "color"}.issubset(item.keys())

    def test_search_still_works(self, owner_c):
        r = owner_c.get(f"{API}/search", params={"q": "a"})
        assert r.status_code == 200
        assert "tasks" in r.json() and "ideas" in r.json()
