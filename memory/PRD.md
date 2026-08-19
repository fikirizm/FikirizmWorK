# Fikirizm Cloud — PRD

## Problem Statement
ClickUp/Linear/Notion seviyesinde, Türkçe arayüzlü, multi-tenant hazır proje & görev yönetim SaaS'ı (Fikirizm için). Görev yönetimi (4 görünüm), fikir/öneri panosu, dashboard, bildirimler, roller ve gerçek zamanlı güncellemeler.

## Architecture
- **Frontend**: React 19 + CRACO, Tailwind, shadcn/ui, react-query, framer-motion, recharts. Fonts: Outfit (başlık) + Inter (gövde). İndigo birincil renk. Açık/Koyu tema (next-themes).
- **Backend**: FastAPI (modüler: server.py, routes.py, deps.py, models.py, seed.py, realtime.py). Tüm rotalar `/api` önekli.
- **DB**: MongoDB. UUID `id`/`user_id` desenli (ObjectId sızıntısı yok). Her belge `org_id` + `workspace_id` taşır (multi-tenant izolasyona hazır).
- **Auth**: Email/parola (JWT) + Emergent Google OAuth. ÖNEMLİ: platform ingress CORS'u `*`'a zorladığı için tarayıcıda cookie/credentialed istekler bloklanıyor → **Bearer token** (localStorage `fik_token`) kullanılıyor. Backend hem cookie hem Bearer (JWT veya Google session token) çözer.
- **Realtime**: WebSocket `/api/ws/{workspace_id}` (token ile auth'lı); mutasyonlar workspace'e broadcast edilir, frontend react-query invalidate eder.

## User Personas
- **Owner (ingobiosport@gmail.com)**: tam yetki, üye davet.
- **Admin**: üye yönetimi + tüm projeler.
- **Member**: atandığı/erişimi olan işler.

## Core Requirements (static)
1. Görev yönetimi: Liste, Kanban (drag-drop), Takvim, Gantt görünümleri; başlık, zengin metin açıklama, durum, öncelik, atananlar, son tarih, etiket, checklist, alt görev, yorum. Toplu işlem, filtre, global arama (Cmd/Ctrl+K).
2. Fikirler modülü: ekleme, upvote, yorum, durum akışı (Yeni→Değerlendiriliyor→Onaylandı→Reddedildi), göreve dönüştürme, sıralama.
3. Dashboard: açık/geciken/bu hafta/tamamlanan metrikleri, durum dağılımı & iş yükü grafikleri, bana atananlar, son aktiviteler.
4. Bildirim merkezi (atama, yorum, oy, durum değişimi).
5. Kullanıcı & rol yönetimi, workspace üye davet.

## Implemented (2026-08-19)
- ✅ Tüm auth (JWT + Google OAuth wiring), brute-force lockout (eşik bazlı), Bearer token akışı.
- ✅ Bootstrap, workspace/proje CRUD, görev CRUD + alt görev + checklist + yorum + toplu işlem + filtre.
- ✅ 4 görünüm (Liste reorder, Kanban drag-drop, Takvim, Gantt).
- ✅ Fikirler: CRUD, oy, yorum, durum, göreve dönüştürme, sıralama.
- ✅ Dashboard grafikleri, bildirim merkezi, global arama (regex-escape'li), üye yönetimi + davet.
- ✅ WebSocket realtime (token auth'lı). Açık/koyu tema. Türkçe arayüz. Seed demo verisi.

## Implemented — İterasyon 2 (2026-08-19)
- ✅ **Proje bazlı erişim kontrolü**: Owner/Admin tüm projeleri görür; Member yalnızca `members` listesinde olduğu (veya oluşturduğu) projeleri görür. Bootstrap, görev listeleme, arama ve bütçe erişimi proje erişimine göre filtreli; yetkisiz erişim 403.
- ✅ **Proje şablonları**: Genel / Etkinlik-Yarış / Kamp — şablona göre varsayılan durumlar + bütçe kategorileri. Proje oluştururken şablon, para birimi ve erişecek üyeler seçilir.
- ✅ **Proje bazında para birimi** (₺/$/€).
- ✅ **Kapsamlı bütçe modülü**: gelir/gider kalemleri (kategori, açıklama, planlanan/gerçekleşen tutar, tarih, sorumlu, ilişkili görev), planlanan-vs-gerçekleşen grafiği, kategori özeti, bakiye kartları. Esnek düzenleme yetkisi (`budget_policy`: admins | members). Erişimi olan herkes görüntüler.
- ✅ **Proje Ayarları** (Owner/Admin): üye, para birimi ve bütçe düzenleme politikasını değiştirme.
- ✅ Dashboard done tespiti şablona göre (durum `done` bayrağı) çalışır.
- ✅ ResizeObserver dev-overlay bastırıldı; sidebar proje oluşturma refetch ile güvence altına alındı.
- ✅ Test: backend 34/34 pytest pass (it1+it2), frontend E2E ~%95→düzeltmeler uygulandı.

## Backlog
- **P1**: E-posta bildirimleri (Resend); gerçek davet akışı (tek kullanımlık token/parola, şu an DEMO_PASSWORD ile eklenir); tam Gantt bağımlılık motoru; dosya eki yükleme (object storage).
- **P2**: Google OAuth E2E doğrulama; çoklu organizasyon UI'ı; özelleştirilebilir durum yönetimi UI; mobil sidebar; Slack entegrasyonu.

## Next Tasks
- Resend ile e-posta bildirimleri.
- Görev dosya ekleri (object storage).
- Gerçek üye davet akışı (davet e-postası + kurulum linki).

## Implemented — İterasyon 3 (2026-08-19)
- ✅ **Bütçe dışa aktarma**: Excel (.xlsx / openpyxl) ve PDF (reportlab) — `GET /api/projects/{id}/budget/export?fmt=xlsx|pdf`, BudgetView'da Excel/PDF butonları (blob indirme).
- ✅ **Görev-bütçe özeti**: `GET /api/tasks/{id}` yanıtına `budget_summary` (count/planned/actual/currency); TaskDrawer'da "Bağlı Bütçe" bölümü.
- ✅ **Rol bazlı görev gizliliği**: görevlerde `visibility` (project|private) + `visible_to`; Owner/Admin hepsini görür, aksi halde sadece seçili kişiler + atananlar + oluşturan. Liste/get erişimi filtreli (yetkisiz 403). TaskDrawer'da görünürlük seçimi + kişi seçici.
- ✅ **E-posta bildirimleri (Resend, Emergent managed)**: projeye üye eklenince ve göreve atanınca otomatik e-posta (`mailer.py`, güvenlik gate'li, non-blocking). Gerçek gönderim doğrulandı.
- ✅ Komut paletine gizli DialogTitle (a11y) eklendi.
- ✅ Test: iteration3 backend 13/13, frontend UI %100.
