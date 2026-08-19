"""Backend API tests for Fikirizm Cloud."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://work-dashboard-69.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "ingobiosport@gmail.com", "password": "Fikirizm2025!"}
MEMBER = {"email": "elif@fikirizm.com", "password": "Demo2025!"}


@pytest.fixture(scope="session")
def owner_client():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=OWNER, timeout=20)
    assert r.status_code == 200, f"owner login failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def bootstrap_data(owner_client):
    r = owner_client.get(f"{API}/bootstrap")
    assert r.status_code == 200
    return r.json()


# ---------- AUTH ----------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json=OWNER, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and "user" in d
        assert d["user"]["email"] == OWNER["email"]
        assert d["user"]["role"] == "owner"

    def test_login_wrong_password(self):
        # unique email to avoid triggering lockout for owner
        r = requests.post(f"{API}/auth/login",
                          json={"email": "nonexistent_test@fikirizm.com", "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_me_with_bearer(self, owner_client):
        r = owner_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == OWNER["email"]

    def test_me_without_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code in (401, 403)

    def test_member_login(self):
        r = requests.post(f"{API}/auth/login", json=MEMBER, timeout=20)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"


# ---------- BOOTSTRAP ----------
class TestBootstrap:
    def test_bootstrap_shape(self, bootstrap_data):
        b = bootstrap_data
        assert b["org"]["name"] == "Fikirizm"
        assert len(b["workspaces"]) >= 1
        assert len(b["projects"]) >= 3
        assert len(b["members"]) >= 4
        # ensure password_hash not leaked
        for m in b["members"]:
            assert "password_hash" not in m


# ---------- TASKS ----------
class TestTasks:
    def test_list_tasks(self, owner_client, bootstrap_data):
        proj = bootstrap_data["projects"][0]
        r = owner_client.get(f"{API}/tasks", params={"project_id": proj["id"]})
        assert r.status_code == 200
        tasks = r.json()
        assert isinstance(tasks, list)
        assert len(tasks) > 0

    def test_task_crud(self, owner_client, bootstrap_data):
        proj = bootstrap_data["projects"][0]
        ws_id = bootstrap_data["workspaces"][0]["id"]
        payload = {
            "workspace_id": ws_id, "project_id": proj["id"],
            "title": "TEST_pytest_task", "priority": "high", "status": "todo",
            "assignees": [], "tags": ["test"], "checklist": []
        }
        r = owner_client.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        task = r.json()
        assert task["title"] == "TEST_pytest_task"
        tid = task["id"]

        # GET
        r = owner_client.get(f"{API}/tasks/{tid}")
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_pytest_task"

        # PATCH status
        r = owner_client.patch(f"{API}/tasks/{tid}", json={"status": "in_progress"})
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"

        # GET verify persistence
        r = owner_client.get(f"{API}/tasks/{tid}")
        assert r.json()["status"] == "in_progress"

        # comment
        r = owner_client.post(f"{API}/tasks/{tid}/comments", json={"text": "TEST comment"})
        assert r.status_code == 200

        # DELETE
        r = owner_client.delete(f"{API}/tasks/{tid}")
        assert r.status_code == 200
        r = owner_client.get(f"{API}/tasks/{tid}")
        assert r.status_code == 404

    def test_bulk_update(self, owner_client, bootstrap_data):
        proj = bootstrap_data["projects"][0]
        ws_id = bootstrap_data["workspaces"][0]["id"]
        ids = []
        for i in range(2):
            r = owner_client.post(f"{API}/tasks", json={
                "workspace_id": ws_id, "project_id": proj["id"],
                "title": f"TEST_bulk_{i}", "status": "todo"})
            ids.append(r.json()["id"])
        r = owner_client.post(f"{API}/tasks/bulk", json={"ids": ids, "updates": {"status": "done"}})
        assert r.status_code == 200
        for tid in ids:
            assert owner_client.get(f"{API}/tasks/{tid}").json()["status"] == "done"
            owner_client.delete(f"{API}/tasks/{tid}")


# ---------- IDEAS ----------
class TestIdeas:
    def test_list_ideas(self, owner_client):
        r = owner_client.get(f"{API}/ideas")
        assert r.status_code == 200
        ideas = r.json()
        assert len(ideas) >= 4
        assert "vote_count" in ideas[0]

    def test_idea_vote_toggle(self, owner_client):
        r = owner_client.get(f"{API}/ideas")
        idea = r.json()[0]
        before = idea["vote_count"]
        r = owner_client.post(f"{API}/ideas/{idea['id']}/vote")
        assert r.status_code == 200
        after1 = r.json()["vote_count"]
        assert after1 != before
        r = owner_client.post(f"{API}/ideas/{idea['id']}/vote")
        after2 = r.json()["vote_count"]
        assert after2 == before

    def test_idea_create_and_convert(self, owner_client, bootstrap_data):
        ws_id = bootstrap_data["workspaces"][0]["id"]
        proj = bootstrap_data["projects"][0]
        r = owner_client.post(f"{API}/ideas", json={
            "workspace_id": ws_id, "project_id": proj["id"],
            "title": "TEST_idea_convert", "description": "test"})
        assert r.status_code == 200
        iid = r.json()["id"]
        r = owner_client.post(f"{API}/ideas/{iid}/convert")
        assert r.status_code == 200
        d = r.json()
        assert "task" in d and d["task"]["title"] == "TEST_idea_convert"
        owner_client.delete(f"{API}/tasks/{d['task']['id']}")


# ---------- DASHBOARD ----------
class TestDashboard:
    def test_dashboard(self, owner_client):
        r = owner_client.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ("open_count", "overdue_count", "upcoming_count", "done_count",
                  "status_distribution", "workload", "my_tasks", "recent_activities"):
            assert k in d


# ---------- NOTIFICATIONS ----------
class TestNotifications:
    def test_list_and_read_all(self, owner_client):
        r = owner_client.get(f"{API}/notifications")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        r = owner_client.post(f"{API}/notifications/read-all")
        assert r.status_code == 200


# ---------- MEMBERS ----------
class TestMembers:
    def test_list_members(self, owner_client):
        r = owner_client.get(f"{API}/members")
        assert r.status_code == 200
        members = r.json()
        assert len(members) >= 4

    def test_invite_forbidden_for_member(self):
        # login as member (role=member)
        r = requests.post(f"{API}/auth/login",
                          json={"email": "mert@fikirizm.com", "password": "Demo2025!"}, timeout=20)
        assert r.status_code == 200
        token = r.json()["token"]
        r = requests.post(f"{API}/members/invite",
                          json={"name": "X", "email": "x@x.com", "role": "member"},
                          headers={"Authorization": f"Bearer {token}"}, timeout=20)
        assert r.status_code == 403


# ---------- SEARCH ----------
class TestSearch:
    def test_search_kanban(self, owner_client):
        r = owner_client.get(f"{API}/search", params={"q": "Kanban"})
        assert r.status_code == 200
        d = r.json()
        assert "tasks" in d and "ideas" in d
        assert len(d["tasks"]) >= 1
