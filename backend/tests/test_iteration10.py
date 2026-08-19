"""Iteration 10 tests: idea delete, change-password, in-app notif prefs,
workspaces, task parent_id nesting + promote."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://team-gantt-4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "ingobiosport@gmail.com", "password": "Fikirizm2025!"}
ADMIN = {"email": "elif@fikirizm.com", "password": "Demo2025!"}
MEMBER = {"email": "mert@fikirizm.com", "password": "Demo2025!"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()["token"], r.json()["user"]


def _sess(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def owner_session():
    t, u = _login(OWNER)
    s = _sess(t)
    s.user = u
    return s


@pytest.fixture(scope="module")
def member_session():
    t, u = _login(MEMBER)
    s = _sess(t)
    s.user = u
    return s


@pytest.fixture(scope="module")
def admin_session():
    t, u = _login(ADMIN)
    s = _sess(t)
    s.user = u
    return s


@pytest.fixture(scope="module")
def bootstrap(owner_session):
    return owner_session.get(f"{API}/bootstrap").json()


# ---------- IDEAS DELETE ----------
class TestIdeaDelete:
    def test_owner_can_delete_own_idea(self, owner_session, bootstrap):
        ws = bootstrap["workspaces"][0]["id"]
        proj = bootstrap["projects"][0]["id"]
        r = owner_session.post(f"{API}/ideas", json={
            "workspace_id": ws, "project_id": proj,
            "title": "TEST_del_idea", "description": "x"})
        assert r.status_code == 200
        iid = r.json()["id"]
        r = owner_session.delete(f"{API}/ideas/{iid}")
        assert r.status_code == 200
        assert r.json() == {"ok": True}
        # verify gone
        r = owner_session.get(f"{API}/ideas")
        assert not any(i["id"] == iid for i in r.json())

    def test_delete_missing_idea_returns_404(self, owner_session):
        r = owner_session.delete(f"{API}/ideas/does-not-exist-{uuid.uuid4()}")
        assert r.status_code == 404

    def test_member_cannot_delete_others_idea_403(self, owner_session, member_session, bootstrap):
        # Owner creates the idea; member tries to delete it
        ws = bootstrap["workspaces"][0]["id"]
        proj = bootstrap["projects"][0]["id"]
        r = owner_session.post(f"{API}/ideas", json={
            "workspace_id": ws, "project_id": proj,
            "title": "TEST_del_idea_403", "description": "x"})
        iid = r.json()["id"]
        try:
            r = member_session.delete(f"{API}/ideas/{iid}")
            assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text}"
        finally:
            owner_session.delete(f"{API}/ideas/{iid}")

    def test_member_can_delete_own_idea(self, member_session, bootstrap):
        ws = bootstrap["workspaces"][0]["id"]
        proj = bootstrap["projects"][0]["id"]
        r = member_session.post(f"{API}/ideas", json={
            "workspace_id": ws, "project_id": proj,
            "title": "TEST_member_own_idea", "description": "x"})
        assert r.status_code == 200
        iid = r.json()["id"]
        r = member_session.delete(f"{API}/ideas/{iid}")
        assert r.status_code == 200


# ---------- CHANGE PASSWORD ----------
class TestChangePassword:
    """Uses admin (elif) so we do not touch the primary owner password."""

    def test_wrong_current_password(self, admin_session):
        r = admin_session.post(f"{API}/auth/change-password",
                               json={"current_password": "definitely_wrong",
                                     "new_password": "Whatever2025!"})
        assert r.status_code == 400
        assert "hatalı" in r.text.lower() or "hatal" in r.text.lower()

    def test_same_password_rejected(self, admin_session):
        r = admin_session.post(f"{API}/auth/change-password",
                               json={"current_password": "Demo2025!",
                                     "new_password": "Demo2025!"})
        assert r.status_code == 400

    def test_change_and_restore(self):
        # separate token because rotating password may invalidate module session
        t, _ = _login(ADMIN)
        s = _sess(t)
        new_pw = "Demo2025!Temp"
        r = s.post(f"{API}/auth/change-password",
                   json={"current_password": "Demo2025!", "new_password": new_pw})
        assert r.status_code == 200, r.text
        # login with new password works
        r2 = requests.post(f"{API}/auth/login",
                           json={"email": ADMIN["email"], "password": new_pw}, timeout=20)
        assert r2.status_code == 200
        # restore
        t2 = r2.json()["token"]
        s2 = _sess(t2)
        r3 = s2.post(f"{API}/auth/change-password",
                     json={"current_password": new_pw, "new_password": "Demo2025!"})
        assert r3.status_code == 200
        # verify restored
        r4 = requests.post(f"{API}/auth/login", json=ADMIN, timeout=20)
        assert r4.status_code == 200


# ---------- NOTIFICATION PREFERENCES (in-app) ----------
class TestInAppNotifPrefs:
    def test_get_has_in_app_keys(self, owner_session):
        r = owner_session.get(f"{API}/settings/notifications")
        assert r.status_code == 200
        d = r.json()
        for k in ("in_app_assign", "in_app_comment", "in_app_vote", "in_app_idea"):
            assert k in d, f"missing key {k}: {d}"

    def test_put_persists_and_get_returns(self, owner_session):
        payload = {"in_app_assign": False, "in_app_comment": True,
                   "in_app_vote": False, "in_app_idea": True}
        r = owner_session.put(f"{API}/settings/notifications", json=payload)
        assert r.status_code == 200
        d = r.json()
        for k, v in payload.items():
            assert d[k] == v
        # GET to verify persistence
        r = owner_session.get(f"{API}/settings/notifications")
        d = r.json()
        for k, v in payload.items():
            assert d[k] == v
        # restore defaults
        owner_session.put(f"{API}/settings/notifications",
                          json={"in_app_assign": True, "in_app_comment": True,
                                "in_app_vote": True, "in_app_idea": True})

    def test_in_app_assign_false_suppresses_notification(self, owner_session, bootstrap, admin_session):
        """Set admin's in_app_assign=false, then owner assigns a task to admin.
        Admin should NOT get a new in_app notification for that assignment."""
        admin_id = admin_session.user["user_id"]
        # set admin pref to false
        r = admin_session.put(f"{API}/settings/notifications",
                              json={"in_app_assign": False, "in_app_comment": True,
                                    "in_app_vote": True, "in_app_idea": True})
        assert r.status_code == 200
        # baseline
        before = admin_session.get(f"{API}/notifications").json()
        before_ids = {n["id"] for n in before}
        ws = bootstrap["workspaces"][0]["id"]
        proj = bootstrap["projects"][0]["id"]
        r = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj,
            "title": f"TEST_assign_notif_{uuid.uuid4().hex[:6]}",
            "status": "todo", "assignees": [admin_id]})
        assert r.status_code == 200
        tid = r.json()["id"]
        time.sleep(1)
        after = admin_session.get(f"{API}/notifications").json()
        new_notifs = [n for n in after if n["id"] not in before_ids]
        # No assignment-type notif should have been created for admin
        assert not any(n.get("type") == "assign" for n in new_notifs), \
            f"Assignment notification created despite in_app_assign=false: {new_notifs}"
        # cleanup
        owner_session.delete(f"{API}/tasks/{tid}")
        # restore prefs
        admin_session.put(f"{API}/settings/notifications",
                          json={"in_app_assign": True, "in_app_comment": True,
                                "in_app_vote": True, "in_app_idea": True})


# ---------- WORKSPACES ----------
class TestWorkspaces:
    def test_create_workspace_and_switch(self, owner_session):
        name = f"QA Test WS {uuid.uuid4().hex[:6]}"
        r = owner_session.post(f"{API}/workspaces", json={"name": name})
        assert r.status_code == 200, r.text
        ws = r.json()
        assert ws["name"] == name
        wsid = ws["id"]
        # appears in bootstrap
        b = owner_session.get(f"{API}/bootstrap").json()
        assert any(w["id"] == wsid for w in b["workspaces"])
        # dashboard scoped by workspace_id returns 200
        r = owner_session.get(f"{API}/dashboard", params={"workspace_id": wsid})
        assert r.status_code == 200

    def test_member_cannot_create_workspace(self, member_session):
        r = member_session.post(f"{API}/workspaces", json={"name": "TEST_ws_forbidden"})
        assert r.status_code in (403,), f"expected 403, got {r.status_code} {r.text}"


# ---------- TASK HIERARCHY: parent_id nest + promote ----------
class TestTaskHierarchy:
    def test_nest_and_promote(self, owner_session, bootstrap):
        ws = bootstrap["workspaces"][0]["id"]
        proj = bootstrap["projects"][0]["id"]
        # create two top-level tasks
        a = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj, "title": "TEST_parent", "status": "todo"}).json()
        b = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj, "title": "TEST_child", "status": "todo"}).json()
        try:
            # nest b under a
            r = owner_session.patch(f"{API}/tasks/{b['id']}", json={"parent_id": a["id"]})
            assert r.status_code == 200, r.text
            assert r.json()["parent_id"] == a["id"]
            # verify via GET
            got = owner_session.get(f"{API}/tasks/{b['id']}").json()
            assert got["parent_id"] == a["id"]
            # promote
            r = owner_session.post(f"{API}/tasks/{b['id']}/promote")
            assert r.status_code == 200
            got = owner_session.get(f"{API}/tasks/{b['id']}").json()
            assert got.get("parent_id") in (None, "")
        finally:
            owner_session.delete(f"{API}/tasks/{a['id']}")
            owner_session.delete(f"{API}/tasks/{b['id']}")

    def test_nesting_clamped_to_one_level(self, owner_session, bootstrap):
        ws = bootstrap["workspaces"][0]["id"]
        proj = bootstrap["projects"][0]["id"]
        a = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj, "title": "TEST_gp", "status": "todo"}).json()
        b = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj, "title": "TEST_p", "status": "todo"}).json()
        c = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj, "title": "TEST_c", "status": "todo"}).json()
        try:
            owner_session.patch(f"{API}/tasks/{b['id']}", json={"parent_id": a["id"]})
            # attempt to nest c under b -> should clamp to a
            r = owner_session.patch(f"{API}/tasks/{c['id']}", json={"parent_id": b["id"]})
            assert r.status_code == 200
            # c's parent should be a (grandparent), not b
            got = owner_session.get(f"{API}/tasks/{c['id']}").json()
            assert got["parent_id"] == a["id"], f"expected clamp to grandparent, got {got.get('parent_id')}"
        finally:
            for t in (a, b, c):
                owner_session.delete(f"{API}/tasks/{t['id']}")

    def test_patch_parent_id_null_clears(self, owner_session, bootstrap):
        ws = bootstrap["workspaces"][0]["id"]
        proj = bootstrap["projects"][0]["id"]
        a = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj, "title": "TEST_np", "status": "todo"}).json()
        b = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj, "title": "TEST_nc", "status": "todo"}).json()
        try:
            owner_session.patch(f"{API}/tasks/{b['id']}", json={"parent_id": a["id"]})
            r = owner_session.patch(f"{API}/tasks/{b['id']}", json={"parent_id": None})
            assert r.status_code == 200
            got = owner_session.get(f"{API}/tasks/{b['id']}").json()
            assert got.get("parent_id") in (None, "")
        finally:
            owner_session.delete(f"{API}/tasks/{a['id']}")
            owner_session.delete(f"{API}/tasks/{b['id']}")


# ---------- GANTT: assign date via PATCH ----------
class TestGanttDateAssign:
    def test_patch_start_due_dates(self, owner_session, bootstrap):
        ws = bootstrap["workspaces"][0]["id"]
        proj = bootstrap["projects"][0]["id"]
        t = owner_session.post(f"{API}/tasks", json={
            "workspace_id": ws, "project_id": proj, "title": "TEST_gantt", "status": "todo"}).json()
        try:
            r = owner_session.patch(f"{API}/tasks/{t['id']}", json={
                "start_date": "2026-02-01", "due_date": "2026-02-05"})
            assert r.status_code == 200, r.text
            got = owner_session.get(f"{API}/tasks/{t['id']}").json()
            assert got.get("start_date") and got.get("due_date")
        finally:
            owner_session.delete(f"{API}/tasks/{t['id']}")
