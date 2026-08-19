"""Iteration 11 retests: workspaces RBAC + PATCH /organization."""
import os, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # fallback: read from frontend env file
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL="):
                BASE = ln.split("=",1)[1].strip().rstrip("/")

API = f"{BASE}/api"

def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    j = r.json()
    return j.get("token") or j.get("access_token")

@pytest.fixture(scope="module")
def owner_token():
    return _login("ingobiosport@gmail.com", "Fikirizm2025!")

@pytest.fixture(scope="module")
def member_token():
    return _login("mert@fikirizm.com", "Demo2025!")

def test_member_cannot_create_workspace(member_token):
    r = requests.post(f"{API}/workspaces",
                      headers={"Authorization": f"Bearer {member_token}"},
                      json={"name": "TEST_should_403"}, timeout=15)
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"

def test_owner_can_create_workspace(owner_token):
    r = requests.post(f"{API}/workspaces",
                      headers={"Authorization": f"Bearer {owner_token}"},
                      json={"name": "TEST_iter11_ws"}, timeout=15)
    assert r.status_code in (200, 201), f"got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("name") == "TEST_iter11_ws"
    assert "id" in data

def test_patch_organization_owner(owner_token):
    r = requests.patch(f"{API}/organization",
                       headers={"Authorization": f"Bearer {owner_token}"},
                       json={}, timeout=15)
    assert r.status_code == 200, f"got {r.status_code}: {r.text}"
    data = r.json()
    assert "id" in data or "name" in data

def test_patch_organization_member_forbidden(member_token):
    r = requests.patch(f"{API}/organization",
                       headers={"Authorization": f"Bearer {member_token}"},
                       json={}, timeout=15)
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"
