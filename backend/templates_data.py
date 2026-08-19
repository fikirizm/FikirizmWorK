TEMPLATES = {
    "general": {
        "label": "Genel Proje",
        "icon": "Folder",
        "statuses": [
            {"id": "todo", "name": "Yapılacak", "color": "#71717A", "order": 0},
            {"id": "in_progress", "name": "Devam Ediyor", "color": "#3B82F6", "order": 1},
            {"id": "review", "name": "İncelemede", "color": "#F59E0B", "order": 2},
            {"id": "done", "name": "Tamamlandı", "color": "#10B981", "order": 3, "done": True},
        ],
        "budget_categories": {
            "income": ["Bütçe", "Diğer Gelir"],
            "expense": ["Genel Gider", "Malzeme", "Hizmet", "Personel"],
        },
    },
    "event": {
        "label": "Etkinlik / Yarış",
        "icon": "Trophy",
        "statuses": [
            {"id": "planlama", "name": "Planlama", "color": "#71717A", "order": 0},
            {"id": "hazirlik", "name": "Hazırlık", "color": "#3B82F6", "order": 1},
            {"id": "uygulama", "name": "Uygulama", "color": "#F59E0B", "order": 2},
            {"id": "tamamlandi", "name": "Tamamlandı", "color": "#10B981", "order": 3, "done": True},
        ],
        "budget_categories": {
            "income": ["Sponsorluk", "Katılım Ücreti", "Bilet Satışı", "Bağış"],
            "expense": ["Mekan", "Ekipman", "Ödüller", "Lojistik", "Pazarlama", "Personel", "Güvenlik", "Sağlık"],
        },
    },
    "camp": {
        "label": "Kamp",
        "icon": "Tent",
        "statuses": [
            {"id": "planlama", "name": "Planlama", "color": "#71717A", "order": 0},
            {"id": "kayit", "name": "Kayıt", "color": "#6366F1", "order": 1},
            {"id": "devam", "name": "Devam Ediyor", "color": "#F59E0B", "order": 2},
            {"id": "tamamlandi", "name": "Tamamlandı", "color": "#10B981", "order": 3, "done": True},
        ],
        "budget_categories": {
            "income": ["Katılımcı Ücreti", "Sponsorluk", "Bağış"],
            "expense": ["Konaklama", "Yemek", "Ulaşım", "Eğitmen", "Malzeme", "Sigorta"],
        },
    },
}


def get_template(key):
    return TEMPLATES.get(key or "general", TEMPLATES["general"])
