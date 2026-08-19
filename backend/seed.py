import os
import uuid
from datetime import datetime, timezone, timedelta
from deps import db, hash_password, verify_password
from templates_data import TEMPLATES

GEN = TEMPLATES["general"]["statuses"]
EVT = TEMPLATES["event"]["statuses"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def nid(p):
    return f"{p}{uuid.uuid4().hex[:16]}"


def iso_offset(days):
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id")
    await db.user_sessions.create_index("session_token")
    await db.login_attempts.create_index("identifier")
    await db.tasks.create_index("project_id")
    await db.tasks.create_index("workspace_id")
    await db.ideas.create_index("workspace_id")
    await db.notifications.create_index("user_id")
    await db.budget_items.create_index("project_id")


async def _backfill_activity_projects(org_id):
    projects = await db.projects.find({"org_id": org_id}, {"_id": 0}).to_list(2000)
    existing_pids = [p["id"] for p in projects]
    # remove activities that point to a project that no longer exists (deleted projects)
    await db.activities.delete_many({"org_id": org_id, "project_id": {"$ne": None, "$nin": existing_pids}})
    acts = await db.activities.find(
        {"org_id": org_id, "$or": [{"project_id": {"$exists": False}}, {"project_id": None}]},
        {"_id": 0}).to_list(5000)
    if not acts:
        return
    tasks = await db.tasks.find({"org_id": org_id}, {"_id": 0}).to_list(5000)
    ideas = await db.ideas.find({"org_id": org_id}, {"_id": 0}).to_list(2000)
    budget = await db.budget_items.find({"org_id": org_id}, {"_id": 0}).to_list(5000)
    proj_by_name, task_by_title, idea_by_title, budget_by_cat = {}, {}, {}, {}
    for p in projects:
        proj_by_name.setdefault((p["workspace_id"], p["name"]), p["id"])
    for t in tasks:
        task_by_title.setdefault((t["workspace_id"], t["title"]), t.get("project_id"))
    for i in ideas:
        idea_by_title.setdefault((i["workspace_id"], i["title"]), i.get("project_id"))
    for b in budget:
        budget_by_cat.setdefault((b["workspace_id"], b.get("category")), b.get("project_id"))
    for a in acts:
        ws, tgt, act = a.get("workspace_id"), a.get("target"), a.get("action", "")
        matched, pid = True, None
        if "proje" in act:
            matched = (ws, tgt) in proj_by_name
            pid = proj_by_name.get((ws, tgt))
        elif "fikir" in act:
            matched = (ws, tgt) in idea_by_title
            pid = idea_by_title.get((ws, tgt))
        elif "görev" in act:
            matched = (ws, tgt) in task_by_title
            pid = task_by_title.get((ws, tgt))
        elif "bütçe" in act:
            matched = (ws, tgt) in budget_by_cat
            pid = budget_by_cat.get((ws, tgt))
        if matched:
            await db.activities.update_one({"id": a["id"]}, {"$set": {"project_id": pid}})
        else:
            await db.activities.delete_one({"id": a["id"]})


async def _migrate(org_id):
    # backfill new project fields for existing demo projects
    projs = await db.projects.find({"org_id": org_id}, {"_id": 0}).to_list(1000)
    users = await db.users.find({"org_id": org_id}, {"_id": 0, "user_id": 1}).to_list(200)
    all_ids = [u["user_id"] for u in users]
    for p in projs:
        updates = {}
        if "members" not in p:
            updates["members"] = all_ids
        if "currency" not in p:
            updates["currency"] = "TRY"
        if "template" not in p:
            updates["template"] = "general"
        if "budget_policy" not in p:
            updates["budget_policy"] = "admins"
        if "budget_categories" not in p:
            updates["budget_categories"] = TEMPLATES["general"]["budget_categories"]
        if updates:
            await db.projects.update_one({"id": p["id"]}, {"$set": updates})
    await _backfill_activity_projects(org_id)


async def seed():
    await ensure_indexes()
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    demo_password = os.environ.get("DEMO_PASSWORD", "Demo2025!")

    org = await db.organizations.find_one({})
    if org:
        existing = await db.users.find_one({"email": admin_email})
        if existing and (not existing.get("password_hash") or not verify_password(admin_password, existing["password_hash"])):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        await _migrate(org["id"])
        return

    org_id = nid("org_")
    await db.organizations.insert_one({"id": org_id, "name": "Fikirizm", "created_at": now_iso()})

    ws_id = nid("ws_")
    await db.workspaces.insert_one({
        "id": ws_id, "org_id": org_id, "name": "Fikirizm Ekibi",
        "description": "Fikirizm şirket içi çalışma alanı", "created_at": now_iso(), "created_by": "system",
    })

    admin_id = nid("user_")
    users = [
        {"user_id": admin_id, "email": admin_email, "name": "Fikirizm Yöneticisi",
         "password_hash": hash_password(admin_password), "picture": "", "org_id": org_id,
         "role": "owner", "created_at": now_iso()},
        {"user_id": nid("user_"), "email": "elif@fikirizm.com", "name": "Elif Kaya",
         "password_hash": hash_password(demo_password), "picture": "", "org_id": org_id,
         "role": "admin", "created_at": now_iso()},
        {"user_id": nid("user_"), "email": "mert@fikirizm.com", "name": "Mert Demir",
         "password_hash": hash_password(demo_password), "picture": "", "org_id": org_id,
         "role": "member", "created_at": now_iso()},
        {"user_id": nid("user_"), "email": "zeynep@fikirizm.com", "name": "Zeynep Aksoy",
         "password_hash": hash_password(demo_password), "picture": "", "org_id": org_id,
         "role": "member", "created_at": now_iso()},
    ]
    await db.users.insert_many(users)
    ids = [u["user_id"] for u in users]
    all_ids = ids[:]
    for u in users:
        await db.memberships.insert_one({"workspace_id": ws_id, "user_id": u["user_id"], "org_id": org_id})

    projects = [
        {"id": nid("prj_"), "org_id": org_id, "workspace_id": ws_id, "name": "Ürün Geliştirme",
         "description": "Fikirizm Cloud ürün yol haritası", "color": "#6366F1", "icon": "Rocket",
         "template": "general", "statuses": GEN, "budget_categories": TEMPLATES["general"]["budget_categories"],
         "currency": "TRY", "budget_policy": "admins", "members": all_ids,
         "created_at": now_iso(), "created_by": admin_id},
        {"id": nid("prj_"), "org_id": org_id, "workspace_id": ws_id, "name": "Pazarlama",
         "description": "Kampanyalar ve içerik takvimi", "color": "#F59E0B", "icon": "Megaphone",
         "template": "general", "statuses": GEN, "budget_categories": TEMPLATES["general"]["budget_categories"],
         "currency": "TRY", "budget_policy": "members", "members": all_ids,
         "created_at": now_iso(), "created_by": admin_id},
        {"id": nid("prj_"), "org_id": org_id, "workspace_id": ws_id, "name": "Operasyon (Gizli)",
         "description": "Sadece yönetim ekibine açık", "color": "#10B981", "icon": "Settings",
         "template": "general", "statuses": GEN, "budget_categories": TEMPLATES["general"]["budget_categories"],
         "currency": "TRY", "budget_policy": "admins", "members": [ids[0], ids[1]],
         "created_at": now_iso(), "created_by": admin_id},
        {"id": nid("prj_"), "org_id": org_id, "workspace_id": ws_id, "name": "Bisiklet Festivali 2026",
         "description": "Yıllık şehir bisiklet yarışı ve festivali organizasyonu", "color": "#EC4899", "icon": "Trophy",
         "template": "event", "statuses": EVT, "budget_categories": TEMPLATES["event"]["budget_categories"],
         "currency": "TRY", "budget_policy": "members", "members": all_ids,
         "created_at": now_iso(), "created_by": ids[1]},
    ]
    await db.projects.insert_many(projects)
    p1, p2, p3, p4 = [p["id"] for p in projects]

    tasks_spec = [
        (p1, "Kanban sürükle-bırak akışını tamamla", "in_progress", "high", [ids[0], ids[2]], 2, ["frontend"], "<p>Pano görünümü akıcı olmalı.</p>"),
        (p1, "Zengin metin editörünü entegre et", "todo", "medium", [ids[2]], 5, ["frontend"], "<p><b>Kalın</b>, <i>italik</i>, liste desteği.</p>"),
        (p1, "Gerçek zamanlı güncellemeleri test et", "review", "urgent", [ids[1]], -1, ["backend"], "<p>WebSocket senkronizasyonu.</p>"),
        (p1, "Takvim görünümü tasarımı", "done", "low", [ids[3]], -3, ["design"], "<p>Aylık takvim gridi.</p>"),
        (p1, "Dashboard grafiklerini bağla", "in_progress", "high", [ids[1], ids[3]], 1, ["dashboard"], "<p>Canlı veri grafikleri.</p>"),
        (p2, "Q3 lansman kampanyası planı", "in_progress", "high", [ids[1]], 4, ["kampanya"], "<p>Sosyal medya takvimi.</p>"),
        (p2, "Landing page metinleri", "todo", "medium", [ids[3]], 7, ["içerik"], "<p>Ana sayfa metinleri.</p>"),
        # event project tasks use event status ids
        (p4, "Yarış güzergahını belirle ve izin al", "hazirlik", "urgent", [ids[1], ids[2]], 10, ["lojistik"], "<p>Belediye izinleri ve güvenlik planı.</p>"),
        (p4, "Sponsor anlaşmalarını tamamla", "uygulama", "high", [ids[0]], 6, ["sponsorluk"], "<p>Ana sponsor ve yan sponsorlar.</p>"),
        (p4, "Katılımcı kayıt sistemini aç", "planlama", "high", [ids[3]], 14, ["kayıt"], "<p>Online kayıt formu ve ödeme.</p>"),
        (p4, "Ödül ve madalyaları sipariş et", "planlama", "medium", [ids[2]], 20, ["ödül"], "<p>İlk 3 için kupa, herkese madalya.</p>"),
    ]
    task_docs = []
    order_counter = {}
    first_task_id = None
    for proj, title, status, priority, assignees, due, tags, desc in tasks_spec:
        key = f"{proj}:{status}"
        order_counter[key] = order_counter.get(key, 0)
        tid = nid("tsk_")
        if first_task_id is None:
            first_task_id = tid
        task_docs.append({
            "id": tid, "org_id": org_id, "workspace_id": ws_id, "project_id": proj,
            "parent_id": None, "title": title, "description": desc, "status": status,
            "priority": priority, "assignees": assignees, "due_date": iso_offset(due),
            "start_date": iso_offset(due - 4), "tags": tags,
            "checklist": [
                {"id": nid("chk_"), "text": "Gereksinimleri netleştir", "done": True},
                {"id": nid("chk_"), "text": "İlk taslağı hazırla", "done": status in ("review", "done", "uygulama", "tamamlandi")},
            ],
            "order": order_counter[key], "created_at": now_iso(), "created_by": admin_id,
        })
        order_counter[key] += 1
    await db.tasks.insert_many(task_docs)
    festival_tasks = [t for t in task_docs if t["project_id"] == p4]

    await db.tasks.insert_many([
        {"id": nid("tsk_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p1,
         "parent_id": first_task_id, "title": "Sürükleme animasyonlarını ekle", "description": "",
         "status": "done", "priority": "medium", "assignees": [ids[2]], "due_date": iso_offset(1),
         "start_date": None, "tags": [], "checklist": [], "order": 0, "created_at": now_iso(), "created_by": admin_id},
    ])

    await db.comments.insert_many([
        {"id": nid("cmt_"), "task_id": first_task_id, "user_id": ids[1], "user_name": "Elif Kaya",
         "user_picture": "", "text": "Animasyon süresini 200ms yapalım.", "created_at": now_iso()},
    ])

    # Budget items for the festival project (event)
    budget = [
        (p4, "income", "Sponsorluk", "Ana sponsor - BisikletA.Ş.", 150000, 120000, ids[0]),
        (p4, "income", "Sponsorluk", "Yan sponsorlar (3 firma)", 60000, 45000, ids[1]),
        (p4, "income", "Katılım Ücreti", "500 katılımcı x 250₺", 125000, 87500, ids[3]),
        (p4, "income", "Bilet Satışı", "Festival alanı biletleri", 40000, 0, ids[3]),
        (p4, "expense", "Mekan", "Start/finish alanı kiralama", 35000, 35000, ids[1]),
        (p4, "expense", "Ekipman", "Bariyer, çadır, ses sistemi", 45000, 41000, ids[2]),
        (p4, "expense", "Ödüller", "Kupa, madalya, para ödülü", 30000, 12000, ids[2]),
        (p4, "expense", "Lojistik", "Ulaşım ve ikram", 25000, 18000, ids[1]),
        (p4, "expense", "Pazarlama", "Afiş, sosyal medya reklam", 20000, 15500, ids[3]),
        (p4, "expense", "Güvenlik", "Özel güvenlik + sağlık ekibi", 28000, 0, ids[0]),
        (p1, "income", "Bütçe", "Çeyrek dönem ürün bütçesi", 200000, 200000, ids[0]),
        (p1, "expense", "Personel", "Freelance tasarımcı", 30000, 22000, ids[0]),
        (p1, "expense", "Hizmet", "Bulut altyapı (yıllık)", 48000, 12000, ids[0]),
    ]
    bdocs = []
    for proj, typ, cat, desc, planned, actual, resp in budget:
        # link some expense items to a festival task
        task_link = None
        if proj == p4 and cat in ("Ödüller",) and festival_tasks:
            task_link = next((t["id"] for t in festival_tasks if "Ödül" in t["title"]), None)
        bdocs.append({
            "id": nid("bdg_"), "org_id": org_id, "workspace_id": ws_id, "project_id": proj,
            "type": typ, "category": cat, "description": desc, "planned_amount": planned,
            "actual_amount": actual, "date": iso_offset(-5), "responsible": resp,
            "task_id": task_link, "created_at": now_iso(), "created_by": admin_id,
        })
    await db.budget_items.insert_many(bdocs)

    ideas = [
        {"id": nid("idea_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p1,
         "title": "Görevlere zaman takibi ekleyelim", "status": "evaluating",
         "description": "<p>Harcanan süreyi başlat/durdur ile takip.</p>",
         "upvotes": [ids[0], ids[1], ids[2]], "converted_task_id": None, "created_at": iso_offset(-4),
         "created_by": ids[1], "created_by_name": "Elif Kaya"},
        {"id": nid("idea_"), "org_id": org_id, "workspace_id": ws_id, "project_id": None,
         "title": "Slack entegrasyonu", "status": "new",
         "description": "<p>Görev atandığında Slack bildirimi.</p>",
         "upvotes": [ids[3]], "converted_task_id": None, "created_at": iso_offset(-2),
         "created_by": ids[3], "created_by_name": "Zeynep Aksoy"},
        {"id": nid("idea_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p4,
         "title": "Festivalde çocuklar için mini parkur", "status": "approved",
         "description": "<p>Aileler için ek etkinlik alanı.</p>",
         "upvotes": [ids[0], ids[2]], "converted_task_id": None, "created_at": iso_offset(-6),
         "created_by": ids[2], "created_by_name": "Mert Demir"},
    ]
    await db.ideas.insert_many(ideas)

    activities = [
        {"id": nid("act_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p4, "user_id": ids[1],
         "user_name": "Elif Kaya", "action": "proje oluşturdu", "target": "Bisiklet Festivali 2026", "created_at": iso_offset(-1)},
        {"id": nid("act_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p4, "user_id": ids[0],
         "user_name": "Fikirizm Yöneticisi", "action": "bütçe kalemi ekledi", "target": "Sponsorluk", "created_at": iso_offset(-2)},
    ]
    await db.activities.insert_many(activities)

    await db.notifications.insert_many([
        {"id": nid("ntf_"), "org_id": org_id, "user_id": admin_id, "type": "assign",
         "message": "Elif Kaya sizi 'Kanban sürükle-bırak akışını tamamla' görevine atadı", "link": "", "read": False, "created_at": iso_offset(0)},
        {"id": nid("ntf_"), "org_id": org_id, "user_id": admin_id, "type": "vote",
         "message": "Mert Demir bir fikri oyladı", "link": "/fikirler", "read": False, "created_at": iso_offset(-1)},
    ])
