"""Iteration 3: Budget export, task-budget summary, task privacy, email triggers (non-blocking)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "ingobiosport@gmail.com", "password": "Fikirizm2025!"}
MEMBER = {"email": "mert@fikirizm.com", "password": "Demo2025!"}
ADMIN = {"email": "elif@fikirizm.com", "password": "Demo2025!"}


def _client(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed {creds['email']}: {r.text}"
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def owner_c(): return _client(OWNER)
@pytest.fixture(scope="session")
def member_c(): return _client(MEMBER)
@pytest.fixture(scope="session")
def admin_c(): return _client(ADMIN)


@pytest.fixture(scope="session")
def owner_boot(owner_c):
    return owner_c.get(f"{API}/bootstrap").json()


@pytest.fixture(scope="session")
def festival(owner_boot):
    p = next((x for x in owner_boot["projects"] if "Bisiklet Festivali" in x["name"]), None)
    assert p is not None, "Bisiklet Festivali project missing"
    return p


# -------- BUDGET EXPORT --------
class TestBudgetExport:
    def test_export_xlsx(self, owner_c, festival):
        r = owner_c.get(f"{API}/projects/{festival['id']}/budget/export", params={"fmt": "xlsx"})
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "spreadsheetml" in ct or "officedocument" in ct, f"unexpected content-type: {ct}"
        assert len(r.content) > 100
        # xlsx starts with PK zip magic
        assert r.content[:2] == b"PK"
        cd = r.headers.get("content-disposition", "")
        assert "butce_" in cd.lower(), f"filename should start with butce_: {cd}"

    def test_export_pdf(self, owner_c, festival):
        r = owner_c.get(f"{API}/projects/{festival['id']}/budget/export", params={"fmt": "pdf"})
        assert r.status_code == 200, r.text
        assert "pdf" in r.headers.get("content-type", "").lower()
        assert r.content[:4] == b"%PDF"
        cd = r.headers.get("content-disposition", "")
        assert "butce_" in cd.lower()

    def test_export_forbidden_for_non_member(self, owner_boot, member_c):
        op = next((p for p in owner_boot["projects"] if "Operasyon" in p["name"]), None)
        assert op is not None
        r = member_c.get(f"{API}/projects/{op['id']}/budget/export", params={"fmt": "xlsx"})
        assert r.status_code in (403, 404), f"expected 403/404 got {r.status_code}"


# -------- TASK BUDGET SUMMARY --------
class TestTaskBudgetSummary:
    def test_task_with_budget_link_returns_summary(self, owner_c, festival):
        # find a task titled around 'Ödül ve madalyaları sipariş et'
        tasks = owner_c.get(f"{API}/tasks", params={"project_id": festival["id"]}).json()
        target = next((t for t in tasks if "Ödül" in t.get("title", "") or "madalya" in t.get("title", "").lower()), None)
        assert target is not None, f"target task not found among: {[t['title'] for t in tasks]}"
        r = owner_c.get(f"{API}/tasks/{target['id']}")
        assert r.status_code == 200
        d = r.json()
        assert "budget_summary" in d
        bs = d["budget_summary"]
        for k in ("count", "planned", "actual", "currency"):
            assert k in bs, f"missing key {k} in budget_summary: {bs}"
        assert bs["count"] >= 1
        assert bs["currency"] == "TRY"
        assert isinstance(bs["planned"], (int, float))
        assert isinstance(bs["actual"], (int, float))

    def test_task_without_budget_returns_empty_summary(self, owner_c, festival, owner_boot):
        # create a fresh task with no budget links
        ws_id = owner_boot["workspaces"][0]["id"]
        r = owner_c.post(f"{API}/tasks", json={
            "workspace_id": ws_id, "project_id": festival["id"],
            "title": "TEST_no_budget_task", "status": "todo"
        })
        assert r.status_code == 200
        tid = r.json()["id"]
        try:
            r = owner_c.get(f"{API}/tasks/{tid}")
            d = r.json()
            bs = d.get("budget_summary")
            # allowed shapes: missing, or count == 0
            if bs is not None:
                assert bs.get("count", 0) == 0
        finally:
            owner_c.delete(f"{API}/tasks/{tid}")


# -------- TASK PRIVACY --------
class TestTaskPrivacy:
    @pytest.fixture(scope="class")
    def private_task(self, owner_c, festival, owner_boot):
        ws_id = owner_boot["workspaces"][0]["id"]
        r = owner_c.post(f"{API}/tasks", json={
            "workspace_id": ws_id, "project_id": festival["id"],
            "title": "TEST_private_task", "status": "todo",
            "assignees": [], "visibility": "private", "visible_to": []
        })
        assert r.status_code == 200, r.text
        t = r.json()
        assert t.get("visibility") == "private"
        yield t
        owner_c.delete(f"{API}/tasks/{t['id']}")

    def test_owner_sees_private_task(self, owner_c, private_task):
        r = owner_c.get(f"{API}/tasks/{private_task['id']}")
        assert r.status_code == 200

    def test_admin_sees_private_task(self, admin_c, private_task):
        r = admin_c.get(f"{API}/tasks/{private_task['id']}")
        assert r.status_code == 200, f"admin (privileged) should see private tasks: {r.status_code}"

    def test_member_forbidden_on_private_task(self, member_c, private_task):
        r = member_c.get(f"{API}/tasks/{private_task['id']}")
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"

    def test_member_list_excludes_private_task(self, member_c, festival, private_task):
        r = member_c.get(f"{API}/tasks", params={"project_id": festival["id"]})
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert private_task["id"] not in ids

    def test_add_visible_to_grants_access(self, owner_c, member_c, private_task, owner_boot):
        mert = next(m for m in owner_boot["members"] if m["email"] == "mert@fikirizm.com")
        r = owner_c.patch(f"{API}/tasks/{private_task['id']}",
                          json={"visible_to": [mert["user_id"]]})
        assert r.status_code == 200
        # member now can see
        r = member_c.get(f"{API}/tasks/{private_task['id']}")
        assert r.status_code == 200
        r = member_c.get(f"{API}/tasks", params={"project_id": private_task["project_id"]})
        assert private_task["id"] in [t["id"] for t in r.json()]


# -------- EMAIL TRIGGERS NON-BLOCKING --------
class TestEmailTriggersNonBlocking:
    def test_create_task_with_assignee_returns_200(self, owner_c, festival, owner_boot):
        ws_id = owner_boot["workspaces"][0]["id"]
        mert = next(m for m in owner_boot["members"] if m["email"] == "mert@fikirizm.com")
        r = owner_c.post(f"{API}/tasks", json={
            "workspace_id": ws_id, "project_id": festival["id"],
            "title": "TEST_email_assign_task", "status": "todo",
            "assignees": [mert["user_id"]]
        })
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        # verify persistence
        assert owner_c.get(f"{API}/tasks/{tid}").json()["assignees"] == [mert["user_id"]]
        owner_c.delete(f"{API}/tasks/{tid}")

    def test_patch_task_add_assignee_returns_200(self, owner_c, festival, owner_boot):
        ws_id = owner_boot["workspaces"][0]["id"]
        r = owner_c.post(f"{API}/tasks", json={
            "workspace_id": ws_id, "project_id": festival["id"],
            "title": "TEST_email_patch_task", "status": "todo", "assignees": []
        })
        tid = r.json()["id"]
        zeynep = next(m for m in owner_boot["members"] if m["email"] == "zeynep@fikirizm.com")
        r = owner_c.patch(f"{API}/tasks/{tid}", json={"assignees": [zeynep["user_id"]]})
        assert r.status_code == 200, r.text
        assert zeynep["user_id"] in r.json()["assignees"]
        owner_c.delete(f"{API}/tasks/{tid}")

    def test_project_patch_add_member_returns_200(self, owner_c, owner_boot):
        # create temp project, then patch members to include mert
        ws_id = owner_boot["workspaces"][0]["id"]
        r = owner_c.post(f"{API}/projects", json={
            "workspace_id": ws_id, "name": "TEST_email_proj",
            "template": "general", "currency": "TRY", "members": []
        })
        assert r.status_code == 200
        pid = r.json()["id"]
        mert = next(m for m in owner_boot["members"] if m["email"] == "mert@fikirizm.com")
        r = owner_c.patch(f"{API}/projects/{pid}", json={"members": [mert["user_id"]]})
        assert r.status_code == 200, r.text
        assert mert["user_id"] in r.json()["members"]
        owner_c.delete(f"{API}/projects/{pid}")
