import os
import uuid
from datetime import datetime, timezone, timedelta
from deps import db, hash_password

STATUSES = [
    {"id": "todo", "name": "Yapılacak", "color": "#71717A", "order": 0},
    {"id": "in_progress", "name": "Devam Ediyor", "color": "#3B82F6", "order": 1},
    {"id": "review", "name": "İncelemede", "color": "#F59E0B", "order": 2},
    {"id": "done", "name": "Tamamlandı", "color": "#10B981", "order": 3},
]


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


async def seed():
    await ensure_indexes()
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    demo_password = os.environ.get("DEMO_PASSWORD", "Demo2025!")

    org = await db.organizations.find_one({})
    if org:
        # keep admin password in sync
        existing = await db.users.find_one({"email": admin_email})
        if existing:
            from deps import verify_password
            if not existing.get("password_hash") or not verify_password(admin_password, existing["password_hash"]):
                await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        return

    org_id = nid("org_")
    await db.organizations.insert_one({"id": org_id, "name": "Fikirizm", "created_at": now_iso()})

    ws_id = nid("ws_")
    await db.workspaces.insert_one({
        "id": ws_id, "org_id": org_id, "name": "Fikirizm Ekibi",
        "description": "Fikirizm şirket içi çalışma alanı", "created_at": now_iso(), "created_by": "system",
    })

    # Users
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
    for u in users:
        await db.memberships.insert_one({"workspace_id": ws_id, "user_id": u["user_id"], "org_id": org_id})

    # Projects
    projects = [
        {"id": nid("prj_"), "org_id": org_id, "workspace_id": ws_id, "name": "Ürün Geliştirme",
         "description": "Fikirizm Cloud ürün yol haritası", "color": "#6366F1", "icon": "Rocket",
         "statuses": STATUSES, "created_at": now_iso(), "created_by": admin_id},
        {"id": nid("prj_"), "org_id": org_id, "workspace_id": ws_id, "name": "Pazarlama",
         "description": "Kampanyalar ve içerik takvimi", "color": "#F59E0B", "icon": "Megaphone",
         "statuses": STATUSES, "created_at": now_iso(), "created_by": admin_id},
        {"id": nid("prj_"), "org_id": org_id, "workspace_id": ws_id, "name": "Operasyon",
         "description": "İç süreçler ve destek", "color": "#10B981", "icon": "Settings",
         "statuses": STATUSES, "created_at": now_iso(), "created_by": admin_id},
    ]
    await db.projects.insert_many(projects)
    p1 = projects[0]["id"]
    p2 = projects[1]["id"]

    tasks_spec = [
        (p1, "Kanban sürükle-bırak akışını tamamla", "in_progress", "high", [ids[0], ids[2]], 2,
         ["frontend", "kanban"], "<p>Pano görünümünde kartların sütunlar arası taşınması pürüzsüz olmalı.</p>"),
        (p1, "Zengin metin editörünü entegre et", "todo", "medium", [ids[2]], 5,
         ["frontend"], "<p>Görev açıklamalarında <b>kalın</b>, <i>italik</i> ve liste desteği.</p>"),
        (p1, "Gerçek zamanlı güncellemeleri test et", "review", "urgent", [ids[1]], -1,
         ["backend", "websocket"], "<p>WebSocket ile çoklu oturum senkronizasyonu.</p>"),
        (p1, "Takvim görünümü tasarımı", "done", "low", [ids[3]], -3,
         ["design"], "<p>Aylık takvim gridinde görevlerin gösterimi tamamlandı.</p>"),
        (p1, "API dokümantasyonu yaz", "todo", "low", [ids[0]], 10,
         ["docs"], "<p>Tüm uç noktalar için örnek istekler.</p>"),
        (p1, "Dashboard grafiklerini bağla", "in_progress", "high", [ids[1], ids[3]], 1,
         ["frontend", "dashboard"], "<p>Durum dağılımı ve iş yükü grafikleri canlı veriyle.</p>"),
        (p2, "Q3 lansman kampanyası planı", "in_progress", "high", [ids[1]], 4,
         ["kampanya"], "<p>Sosyal medya ve e-posta takvimi.</p>"),
        (p2, "Landing page metinleri", "todo", "medium", [ids[3]], 7,
         ["içerik"], "<p>Ana sayfa başlık ve açıklama metinleri.</p>"),
        (p2, "Rakip analizi raporu", "done", "medium", [ids[2]], -5,
         ["araştırma"], "<p>ClickUp, Linear ve Notion karşılaştırması.</p>"),
        (p2, "Blog yazısı: Ekip verimliliği", "review", "low", [ids[1]], 3,
         ["içerik", "blog"], "<p>Verimlilik ipuçları hakkında 1200 kelimelik yazı.</p>"),
    ]
    task_docs = []
    order_counter = {}
    first_task_id = None
    for proj, title, status, priority, assignees, due_offset, tags, desc in tasks_spec:
        key = f"{proj}:{status}"
        order_counter[key] = order_counter.get(key, 0)
        tid = nid("tsk_")
        if first_task_id is None:
            first_task_id = tid
        task_docs.append({
            "id": tid, "org_id": org_id, "workspace_id": ws_id, "project_id": proj,
            "parent_id": None, "title": title, "description": desc, "status": status,
            "priority": priority, "assignees": assignees, "due_date": iso_offset(due_offset),
            "start_date": iso_offset(due_offset - 3), "tags": tags,
            "checklist": [
                {"id": nid("chk_"), "text": "Gereksinimleri netleştir", "done": True},
                {"id": nid("chk_"), "text": "İlk taslağı hazırla", "done": status in ("review", "done")},
                {"id": nid("chk_"), "text": "Gözden geçir", "done": status == "done"},
            ],
            "order": order_counter[key], "created_at": now_iso(), "created_by": admin_id,
        })
        order_counter[key] += 1
    await db.tasks.insert_many(task_docs)

    # subtasks for first task
    await db.tasks.insert_many([
        {"id": nid("tsk_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p1,
         "parent_id": first_task_id, "title": "Sürükleme animasyonlarını ekle", "description": "",
         "status": "done", "priority": "medium", "assignees": [ids[2]], "due_date": iso_offset(1),
         "start_date": None, "tags": [], "checklist": [], "order": 0, "created_at": now_iso(), "created_by": admin_id},
        {"id": nid("tsk_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p1,
         "parent_id": first_task_id, "title": "Bırakma bölgelerini vurgula", "description": "",
         "status": "in_progress", "priority": "high", "assignees": [ids[0]], "due_date": iso_offset(2),
         "start_date": None, "tags": [], "checklist": [], "order": 1, "created_at": now_iso(), "created_by": admin_id},
    ])

    await db.comments.insert_many([
        {"id": nid("cmt_"), "task_id": first_task_id, "user_id": ids[1], "user_name": "Elif Kaya",
         "user_picture": "", "text": "Animasyon süresini 200ms yapalım, daha akıcı görünüyor.", "created_at": now_iso()},
        {"id": nid("cmt_"), "task_id": first_task_id, "user_id": ids[2], "user_name": "Mert Demir",
         "user_picture": "", "text": "Tamamdır, güncelledim 👍", "created_at": now_iso()},
    ])

    ideas = [
        {"id": nid("idea_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p1,
         "title": "Görevlere zaman takibi (time tracking) ekleyelim", "status": "evaluating",
         "description": "<p>Her görevde harcanan süreyi başlat/durdur ile takip edebilmeliyiz.</p>",
         "upvotes": [ids[0], ids[1], ids[2]], "converted_task_id": None, "created_at": iso_offset(-4),
         "created_by": ids[1], "created_by_name": "Elif Kaya"},
        {"id": nid("idea_"), "org_id": org_id, "workspace_id": ws_id, "project_id": None,
         "title": "Slack entegrasyonu", "status": "new",
         "description": "<p>Görev atandığında Slack'e bildirim düşsün.</p>",
         "upvotes": [ids[3]], "converted_task_id": None, "created_at": iso_offset(-2),
         "created_by": ids[3], "created_by_name": "Zeynep Aksoy"},
        {"id": nid("idea_"), "org_id": org_id, "workspace_id": ws_id, "project_id": p2,
         "title": "Koyu tema için özel renk paletleri", "status": "approved",
         "description": "<p>Kullanıcılar kendi vurgu renklerini seçebilsin.</p>",
         "upvotes": [ids[0], ids[2]], "converted_task_id": None, "created_at": iso_offset(-6),
         "created_by": ids[2], "created_by_name": "Mert Demir"},
        {"id": nid("idea_"), "org_id": org_id, "workspace_id": ws_id, "project_id": None,
         "title": "Mobil uygulama", "status": "rejected",
         "description": "<p>iOS ve Android için native uygulama. Şimdilik kapsam dışı.</p>",
         "upvotes": [ids[1]], "converted_task_id": None, "created_at": iso_offset(-8),
         "created_by": ids[1], "created_by_name": "Elif Kaya"},
    ]
    await db.ideas.insert_many(ideas)
    await db.comments.insert_many([
        {"id": nid("cmt_"), "idea_id": ideas[0]["id"], "user_id": ids[0], "user_name": "Fikirizm Yöneticisi",
         "user_picture": "", "text": "Bu çok faydalı olur, önceliklendirmeliyiz.", "created_at": now_iso()},
        {"id": nid("cmt_"), "idea_id": ideas[0]["id"], "user_id": ids[3], "user_name": "Zeynep Aksoy",
         "user_picture": "", "text": "Raporlama ile de birleştirebiliriz.", "created_at": now_iso()},
    ])

    activities = [
        {"id": nid("act_"), "org_id": org_id, "workspace_id": ws_id, "user_id": ids[1],
         "user_name": "Elif Kaya", "action": "görev oluşturdu", "target": "Q3 lansman kampanyası planı", "created_at": iso_offset(-1)},
        {"id": nid("act_"), "org_id": org_id, "workspace_id": ws_id, "user_id": ids[2],
         "user_name": "Mert Demir", "action": "fikir ekledi", "target": "Slack entegrasyonu", "created_at": iso_offset(-2)},
        {"id": nid("act_"), "org_id": org_id, "workspace_id": ws_id, "user_id": ids[0],
         "user_name": "Fikirizm Yöneticisi", "action": "proje oluşturdu", "target": "Ürün Geliştirme", "created_at": iso_offset(-3)},
    ]
    await db.activities.insert_many(activities)

    await db.notifications.insert_many([
        {"id": nid("ntf_"), "org_id": org_id, "user_id": admin_id, "type": "assign",
         "message": "Elif Kaya sizi 'Kanban sürükle-bırak akışını tamamla' görevine atadı", "link": "", "read": False, "created_at": iso_offset(0)},
        {"id": nid("ntf_"), "org_id": org_id, "user_id": admin_id, "type": "vote",
         "message": "Mert Demir 'Koyu tema için özel renk paletleri' fikrini oyladı", "link": "/fikirler", "read": False, "created_at": iso_offset(-1)},
        {"id": nid("ntf_"), "org_id": org_id, "user_id": admin_id, "type": "comment",
         "message": "Elif Kaya bir göreve yorum yaptı", "link": "", "read": True, "created_at": iso_offset(-2)},
    ])
