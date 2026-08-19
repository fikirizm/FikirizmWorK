"""Iteration 4: attachments, invite, budget alert, cron weekly summary."""
import os
import io
import time
import uuid
import requests
import pytest
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://task-hub-1596.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = ("ingobiosport@gmail.com", "Fikirizm2025!")
MEMBER = ("mert@fikirizm.com", "Demo2025!")
NONMEMBER = ("zeynep@fikirizm.com", "Demo2025!")
CRON_SECRET = "fk_cron_9c1e4b7a2d6f8031e5a94c27b0f6d3a815ec72"


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def hdr(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def owner_token():
    return login(*OWNER)


@pytest.fixture(scope="module")
def member_token():
    return login(*MEMBER)


@pytest.fixture(scope="module")
def nonmember_token():
    return login(*NONMEMBER)


@pytest.fixture(scope="module")
def bisiklet_project(owner_token):
    r = requests.get(f"{API}/bootstrap", headers=hdr(owner_token), timeout=15)
    assert r.status_code == 200
    for p in r.json().get("projects", []):
        if "Bisiklet" in p["name"]:
            return p
    pytest.skip("Bisiklet project not found")


@pytest.fixture(scope="module")
def bisiklet_task(owner_token, bisiklet_project):
    r = requests.get(f"{API}/tasks", headers=hdr(owner_token),
                     params={"project_id": bisiklet_project["id"]}, timeout=15)
    assert r.status_code == 200
    tasks = r.json()
    assert tasks, "no tasks in bisiklet project"
    return tasks[0]


# ---------------- ATTACHMENTS ----------------
class TestAttachments:
    file_id = None
    storage_path = None

    def test_upload_attachment(self, owner_token, bisiklet_task):
        files = {"file": ("TEST_attach.txt", b"hello fikirizm iteration4", "text/plain")}
        r = requests.post(f"{API}/tasks/{bisiklet_task['id']}/attachments",
                          headers=hdr(owner_token), files=files, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["task_id"] == bisiklet_task["id"]
        assert data["original_filename"] == "TEST_attach.txt"
        assert data["is_deleted"] is False
        assert "id" in data and data["id"].startswith("file_")
        assert "_id" not in data
        TestAttachments.file_id = data["id"]

    def test_task_get_includes_attachments(self, owner_token, bisiklet_task):
        r = requests.get(f"{API}/tasks/{bisiklet_task['id']}", headers=hdr(owner_token), timeout=15)
        assert r.status_code == 200
        atts = r.json().get("attachments", [])
        assert any(a["id"] == TestAttachments.file_id for a in atts)

    def test_download_with_bearer(self, owner_token):
        assert TestAttachments.file_id
        r = requests.get(f"{API}/files/{TestAttachments.file_id}/download",
                         headers=hdr(owner_token), timeout=30)
        assert r.status_code == 200
        assert r.content == b"hello fikirizm iteration4"

    def test_download_with_auth_query(self, owner_token):
        r = requests.get(f"{API}/files/{TestAttachments.file_id}/download",
                         params={"auth": owner_token}, timeout=30)
        assert r.status_code == 200
        assert r.content == b"hello fikirizm iteration4"

    def test_download_unauth(self):
        r = requests.get(f"{API}/files/{TestAttachments.file_id}/download", timeout=15)
        assert r.status_code == 401

    def test_upload_too_large(self, owner_token, bisiklet_task):
        big = b"x" * (15 * 1024 * 1024 + 100)
        files = {"file": ("TEST_big.bin", big, "application/octet-stream")}
        r = requests.post(f"{API}/tasks/{bisiklet_task['id']}/attachments",
                          headers=hdr(owner_token), files=files, timeout=60)
        assert r.status_code == 400

    def test_nonmember_cannot_download_private(self, owner_token, nonmember_token, bisiklet_project):
        # create private task, upload attachment, try download as nonmember
        t = requests.post(f"{API}/tasks", headers=hdr(owner_token), json={
            "title": "TEST_priv_task_iter4",
            "project_id": bisiklet_project["id"],
            "workspace_id": bisiklet_project["workspace_id"],
            "visibility": "private",
            "visible_to": [],
        }, timeout=15)
        assert t.status_code == 200, t.text
        tid = t.json()["id"]
        try:
            files = {"file": ("TEST_priv.txt", b"secret data", "text/plain")}
            up = requests.post(f"{API}/tasks/{tid}/attachments",
                               headers=hdr(owner_token), files=files, timeout=30)
            assert up.status_code == 200
            fid = up.json()["id"]
            # non-member gets 403
            r = requests.get(f"{API}/files/{fid}/download", headers=hdr(nonmember_token), timeout=15)
            assert r.status_code == 403, r.text
            # cleanup file
            requests.delete(f"{API}/files/{fid}", headers=hdr(owner_token), timeout=15)
        finally:
            requests.delete(f"{API}/tasks/{tid}", headers=hdr(owner_token), timeout=15)

    def test_delete_attachment(self, owner_token):
        assert TestAttachments.file_id
        r = requests.delete(f"{API}/files/{TestAttachments.file_id}",
                            headers=hdr(owner_token), timeout=15)
        assert r.status_code == 200
        # soft-deleted -> 404 on subsequent download
        r2 = requests.get(f"{API}/files/{TestAttachments.file_id}/download",
                          headers=hdr(owner_token), timeout=15)
        assert r2.status_code == 404


# ---------------- INVITE ----------------
class TestInvite:
    invite_email = f"iter4test_{uuid.uuid4().hex[:8]}@fikirizm.com"
    token = None
    user_id = None

    def test_invite_creates_user_no_token_leak(self, owner_token):
        r = requests.post(f"{API}/members/invite", headers=hdr(owner_token), json={
            "email": TestInvite.invite_email,
            "name": "Iter4 Test User",
            "role": "member",
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "invited"
        assert data["email"] == TestInvite.invite_email
        assert "invite_token" not in data
        assert "password_hash" not in data
        TestInvite.user_id = data["user_id"]

    def test_members_list_shows_invited(self, owner_token):
        r = requests.get(f"{API}/members", headers=hdr(owner_token), timeout=15)
        assert r.status_code == 200
        found = [m for m in r.json() if m.get("email") == TestInvite.invite_email]
        assert found, "invited user not in members list"
        assert found[0].get("status") == "invited"

    def test_admin_only(self, member_token):
        r = requests.post(f"{API}/members/invite", headers=hdr(member_token), json={
            "email": f"noauth_{uuid.uuid4().hex[:6]}@fikirizm.com",
            "name": "X", "role": "member",
        }, timeout=15)
        assert r.status_code == 403

    def test_duplicate_invite_rejected(self, owner_token):
        r = requests.post(f"{API}/members/invite", headers=hdr(owner_token), json={
            "email": TestInvite.invite_email, "name": "Dup", "role": "member",
        }, timeout=15)
        assert r.status_code == 400

    def test_fetch_invite_token_from_db(self):
        # read invite_token from DB
        import asyncio
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def get_tok():
            client = AsyncIOMotorClient(mongo_url)
            u = await client[db_name].users.find_one({"email": TestInvite.invite_email})
            client.close()
            return u

        u = asyncio.get_event_loop().run_until_complete(get_tok())
        assert u and u.get("invite_token")
        TestInvite.token = u["invite_token"]

    def test_get_invite_by_token(self):
        assert TestInvite.token
        r = requests.get(f"{API}/invite/{TestInvite.token}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == TestInvite.invite_email
        assert data["name"] == "Iter4 Test User"
        assert "org_name" in data

    def test_get_invite_bad_token(self):
        r = requests.get(f"{API}/invite/nonexistent_xyz_123", timeout=15)
        assert r.status_code == 404

    def test_accept_invite_and_login(self):
        assert TestInvite.token
        password = "AcceptedPass2026!"
        r = requests.post(f"{API}/invite/{TestInvite.token}/accept",
                          json={"password": password}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["token"]
        assert data["user"]["email"] == TestInvite.invite_email
        # Now login via password
        r2 = requests.post(f"{API}/auth/login",
                           json={"email": TestInvite.invite_email, "password": password}, timeout=15)
        assert r2.status_code == 200

    def test_accept_reused_token_fails(self):
        r = requests.post(f"{API}/invite/{TestInvite.token}/accept",
                          json={"password": "AnotherPass123!"}, timeout=15)
        assert r.status_code == 404

    @classmethod
    def teardown_class(cls):
        # cleanup created user
        import asyncio
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")

        async def cleanup():
            client = AsyncIOMotorClient(mongo_url)
            await client[db_name].users.delete_many({"email": cls.invite_email})
            await client[db_name].memberships.delete_many({"user_id": cls.user_id})
            client.close()
        try:
            asyncio.get_event_loop().run_until_complete(cleanup())
        except Exception:
            pass


# ---------------- BUDGET ALERT ----------------
class TestBudgetAlert:
    project_id = None
    created_items = []

    @classmethod
    def teardown_class(cls):
        tok = login(*OWNER)
        for iid in cls.created_items:
            requests.delete(f"{API}/budget/{iid}", headers=hdr(tok), timeout=10)

    def _get_test_project(self, owner_token):
        r = requests.get(f"{API}/bootstrap", headers=hdr(owner_token), timeout=15)
        projects = r.json().get("projects", [])
        for p in projects:
            if "Bisiklet" in p["name"]:
                return p
        if projects:
            return projects[0]
        pytest.skip("no project")

    def test_no_alert_under_budget(self, owner_token):
        proj = self._get_test_project(owner_token)
        TestBudgetAlert.project_id = proj["id"]
        r = requests.post(f"{API}/projects/{proj['id']}/budget", headers=hdr(owner_token), json={
            "type": "expense", "category": "TEST_iter4",
            "description": "TEST under budget", "planned_amount": 10000, "actual_amount": 1000,
        }, timeout=15)
        assert r.status_code == 200
        TestBudgetAlert.created_items.append(r.json()["id"])

    def test_alert_on_crossing(self, owner_token):
        # Add an expense that crosses over
        r = requests.post(f"{API}/projects/{TestBudgetAlert.project_id}/budget",
                          headers=hdr(owner_token), json={
                              "type": "expense", "category": "TEST_iter4_cross",
                              "description": "TEST cross", "planned_amount": 100,
                              "actual_amount": 999999,
                          }, timeout=20)
        # even if email fails, should still 200 (non-blocking)
        assert r.status_code == 200, r.text
        TestBudgetAlert.created_items.append(r.json()["id"])

    def test_patch_still_over_no_repeat(self, owner_token):
        # bumping actual again while already over should still 200 (no alert)
        iid = TestBudgetAlert.created_items[-1]
        r = requests.patch(f"{API}/budget/{iid}", headers=hdr(owner_token),
                           json={"actual_amount": 1000001}, timeout=15)
        assert r.status_code == 200


# ---------------- CRON ----------------
class TestCron:
    def test_missing_auth(self):
        r = requests.post(f"{API}/cron/weekly-summary", timeout=15)
        assert r.status_code == 401

    def test_wrong_secret(self):
        r = requests.post(f"{API}/cron/weekly-summary",
                          headers={"Authorization": "Bearer wrong"}, timeout=15)
        assert r.status_code == 401

    def test_correct_secret(self):
        r = requests.post(f"{API}/cron/weekly-summary",
                          headers={"Authorization": f"Bearer {CRON_SECRET}"}, timeout=15)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_crons_yml_exists(self):
        import yaml
        with open("/app/.emergent/crons.yml") as f:
            data = yaml.safe_load(f)
        assert "crons" in data
        job = next((c for c in data["crons"] if c["name"] == "weekly-summary"), None)
        assert job is not None
        assert job["cron"] == "0 9 * * 1"
        assert job["timezone"] == "Europe/Istanbul"
        assert "/api/cron/weekly-summary" in job["endpoint"]
