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

## Implemented — İterasyon 4 (2026-08-19)
- ✅ **Görev dosya ekleri (obje depolama)**: TaskDrawer'da "Dosya Ekleri" — yükleme/indirme/silme; 15MB sınırı; gizli görev dosyalarına erişim kontrolü. `POST /tasks/{id}/attachments`, `GET /files/{id}/download?auth=`, `DELETE /files/{id}`. Emergent object storage (`storage.py`, EMERGENT_LLM_KEY).
- ✅ **Bütçe uyarıları**: Gerçekleşen gider planlananı ilk kez aştığında Owner/Admin'e otomatik uyarı e-postası (crossing-detection, non-blocking).
- ✅ **Haftalık özet (cron)**: `/app/.emergent/crons.yml` — her Pazartesi 09:00 Europe/Istanbul → `POST /api/cron/weekly-summary` (WEBHOOK_CRON_SECRET ile korumalı, işi arka planda çalıştırır) her üyeye açık/geciken görev özeti e-postası.
- ✅ **Gerçek üye daveti**: davet e-postası + kurulum bağlantısı (`/davet?token=`), davetli kendi parolasını belirleyip otomatik giriş yapar. `POST /members/invite` (status=invited, token gizli), `GET /invite/{token}`, `POST /invite/{token}/accept`. Üyeler listesinde "Davet bekliyor" rozeti.
- ✅ Test: iteration4 backend 24/24, frontend UI %100.
- ⚠️ Bilinen (önceden mevcut) sınır: Preview ortamında WebSocket handshake 403 dönebiliyor; realtime yayınlar bu durumda sessizce düşer ancak UI her işlemden sonra yeniden veri çektiği için işlevsellik etkilenmez.

## Implemented — İterasyon 5 (2026-08-19)
- ✅ **Görsel önizleme**: Resim ekleri TaskDrawer'da küçük thumbnail olarak gösteriliyor (tıklayınca indirir).
- ✅ **Bütçe eşiği ayarı**: Proje Ayarları'nda %80/%90/%100/%110 eşik; uyarı e-postası gerçekleşen gider planlananın seçilen oranını ilk kez aşınca tetikleniyor (`budget_threshold`).
- ✅ **Günlük hatırlatma**: `crons.yml` → her sabah 08:00 (İstanbul) `POST /api/cron/daily-reminder`; son tarihi bugün/yarın olan görevler için kişiye özel e-posta.
- ✅ **Realtime dayanıklılık**: tasks/ideas/dashboard/budget sorgularına `refetchInterval` (15-20sn) fallback — WebSocket kapalı olsa da ekip değişiklikleri otomatik yansır.
- ✅ **Gelişmiş üye yönetimi**: rol değiştirme (`PATCH /members/{id}`), üyeyi çıkarma (`DELETE /members/{id}` + üyelik/atama temizliği), bekleyen daveti yeniden gönderme (`POST /members/{id}/resend-invite`). MembersPage'de inline rol seçici + çıkar + tekrar davet.
- ✅ **Mobil uyum**: Topbar'da hamburger menü (Sheet) ile mobilde proje/sayfa navigasyonu.
- ✅ **Premium görsel**: yumuşak radyal gradient arka plan, incelmiş gölge derinliği, tutarlı geçiş animasyonları.
- ✅ Doğrulama: backend uçları curl ile teyit (üye rol/çıkar 200, günlük+haftalık cron 401/200, dosya/thumbnail, davet akışı); frontend temiz derleniyor.

## Implemented — İterasyon 6 (2026-08-19)
- ✅ **Mail Ayarları sayfası** (`/ayarlar/mail`, Owner/Admin): sağlayıcı seçimi — Emergent (yönetilen) veya **Özel SMTP / Amazon SES** (host, port, kullanıcı, parola, gönderen, TLS). Kaydet + **test e-postası** butonu. Parola maskeli saklanır. `mailer.send_email` ayara göre SMTP (smtplib, threadpool) veya Emergent üzerinden gönderir.
- ✅ **Aktivite Akışı sayfası** (`/aktivite`): tüm hareketlerin filtrelenebilir zaman tüneli (tür filtresi), 20sn polling.
- ✅ **Görsel Lightbox**: görev eklerindeki resimlere tıklayınca tam boy önizleme + ileri/geri gezinme + kapat.
- ✅ Sidebar'a Aktivite ve (yetkiliye) Mail Ayarları bağlantıları eklendi.
- ✅ Doğrulama: mail ayarları PUT/GET (maskeli) 200, aktivite/lightbox UI derleniyor.
- ⏳ Ertelendi: Bildirim tercihleri (kişi bazlı e-posta türü seçimi) ve sürüklenebilir alt görevler — sonraki tur.

## İterasyon 13 (2026-06) — Bug + Anlamlı Genel Bakış + Aktivite
- 🐛 **Proje silinemiyor bug'ı**: Proje Ayarları'nda hiç silme aksiyonu yoktu. Eklendi — owner/admin için "Projeyi sil" tehlike bölgesi + iki adımlı onay (`DELETE /api/projects/{id}`). Backend'e `is_privileged` yetki kontrolü eklendi; silmede görev + bütçe + aktivite kayıtları da temizleniyor. testing_agent (iteration_8) %100 doğruladı (silme akışı + üye yetki engeli).
- ✨ **Durum Dağılımı → "Proje İlerlemesi"**: Anlamsız durum sayacı yerine aksiyon alınabilir panel — her proje: tamamlanma %, ilerleme çubuğu, "X/Y tamam · Z açık", "N geciken" rozeti; dikkat gerektirenler (geciken/açık) önce sıralı; karta tıklayınca proje açılır. Backend `GET /api/dashboard` yeni `project_progress` alanı (görevsiz projeler gizlenir).
- 🎨 **Aktivite sayfası**: 3 kolonlu karışık düzen → tek sütun (alt alta) net liste; üstte **zaman filtresi** (Bugün / Son 7 gün / Son 30 gün / Tümü) + hareket türü filtresi.

## Redesign — İterasyon 12 (2026-06)
- 🎨 **Durum Dağılımı yeniden tasarımı** (waffle terk edildi → daha okunur/yaratıcı): cesur **segment akış çubuğu** (her segmentte % etiketi, hover ile vurgulama) + altında **büyük editorial rakamlı sıralı satırlar** (mono sayı + durum + mini oran çubuğu + %).
- 🎨 **Tipografi tutarlılığı**: Fikirler, Üyeler, Aktivite ve Ayarlar başlıkları Dashboard ile aynı editorial karaktere getirildi (`font-heading text-3xl/4xl font-light tracking-tighter`).
- 📐 **Tam sayfa yerleşim**: Ortada dar duran sayfalar `max-w-[1600px]` genişliğe alındı — Fikirler 3'lü kart grid'i, Aktivite 3 kolonlu (columns) kare-noktalı akış, Üyeler tam genişlik liste.
- ✅ 4 sayfa ekran görüntüsüyle doğrulandı; temiz derleniyor. (Görsel değişiklikler; API/akış değişmedi.)

## Redesign — İterasyon 11 (2026-06)
- 🎨 **Genel Bakış (Dashboard) "Command-Center / Editorial" yeniden tasarımı** — daha cesur/zengin sürüm:
  - **Command panel hero**: koyu (zinc-950) tam genişlik slab + nokta-grid dokusu + amber radial ışıma; dev editorial selamlama; **amber tamamlanma halkası (SVG, animasyonlu)** done/total yüzdesi; amber "Görevlerime git" CTA.
  - **Metrik kartları**: JetBrains Mono dev sayılar + renkli oran çubukları (Açık=foreground, Geciken=rose, Bu Hafta=amber, Tamamlanan=emerald), hover kenarlık.
  - Durum dağılımı: donut yerine **100 kareli monokrom unit/waffle grid** (opaklık rampası) + sıralı mono lejant (büyük % sayıları); lejanta gelince ilgili kareleri vurgulayan hover mikro-etkileşimi.
  - İş yükü **liderlik tablosu** (kare baş harf + inline progress + mono sayı).
  - Bana Atananlar (sol) yoğun liste + hover translateX; Son Aktiviteler (sağ) **kare noktalı terminal timeline**.
  - framer-motion kademeli giriş + halka/çubuk animasyonları. recharts bu sayfadan kaldırıldı.
- ✅ Açık + koyu tema tam sayfa ekran görüntüleriyle doğrulandı; temiz derleniyor. (Görsel; `/api/dashboard` akışı değişmedi.)

## Redesign — İterasyon 10 (2026-06)
- 🎨 **Kompakt & Premium yeniden tasarım** (design_agent blueprint → `/app/design_guidelines.json`). Genel jenerik indigo görünümden "Tactile Monochrome / Old Money Tech" estetiğine geçiş — token tabanlı olduğu için tüm uygulamaya yayıldı:
  - **Tipografi**: Cabinet Grotesk (başlık) + Manrope (gövde) + JetBrains Mono (veri). Outfit/Inter kaldırıldı.
  - **Renk**: Zinc bazlı monokrom; primary siyah (light) / beyaz (dark). Indigo/mor accent kaldırıldı. CSS değişkenleri (`index.css`) ve `tailwind.config.js` güncellendi.
  - **Yoğunluk**: Sidebar w-64→w-56, topbar h-14→h-12, radius 0.6rem→0.375rem; yumuşak gölgeler düzleştirildi (keskin 1px border), topbar cam efekti (backdrop-blur-xl), %3-5 opaklıkta noise doku katmanı.
  - **Grafikler**: Bütçe ve iş yükü grafikleri monokrom (chart-1..4 zinc tonları + amber accent).
  - `text-white`→`text-primary-foreground` düzeltmeleri (koyu temada görünürlük). Rol rozet renkleri monokrom.
- ✅ Açık + koyu tema, login, dashboard, kanban, bütçe ekran görüntüleriyle doğrulandı; frontend temiz derleniyor. (Görsel değişiklik; işlevsel akışlar değişmedi.)
- 🧹 Aktivite temizliği genişletildi: silinmiş projeye işaret eden (dead-project) aktiviteler de migrasyonla temizleniyor.

## Fix — İterasyon 9 (2026-06)
- 🐛 **Proje sahibinin (creator) çıkarılamaması**: Erişim tamamen `members` listesine bağlandı. Önceki kod `created_by`'ı hem `update_project`'te üye listesine zorla geri ekliyor hem de `can_access_project`/`accessible_project_ids`/`bootstrap` içinde ayrı erişim koşulu sağlıyordu → projeyi oluşturan üye listeden çıkarılamıyordu (örn. Girona'yı oluşturan mkemalkara). Artık oluşturan kişi de çıkarılabiliyor (oluştururken zaten üye listesine ekleniyor; Owner/Admin `is_privileged` ile tüm projeleri görmeye devam eder). Doğrulama (UI'nin kullandığı endpoint ile): üye kendi oluşturduğu projeden çıkarılınca bootstrap'te görünmüyor, `GET /tasks` 403.

## Fixes & Notes — İterasyon 8 (2026-06)
- 🐛 **Erişim kontrolü (üye çıkarma)**: Bir üye projeden çıkarıldığında sidebar'ının güncellenmemesi düzeltildi. `AppData` bootstrap sorgusuna `refetchInterval: 20s` + `refetchOnWindowFocus` eklendi; çıkarılan üye ~20sn içinde (veya yeniden girişte) projeyi görmez, `GET /tasks?project_id=` 403 döner. (Backend zaten doğru filtreliyordu.)
- 🐛 **Aktivite akışı sızıntısı**: Aktivitelere `project_id` eklendi; `GET /api/activities` ve dashboard `recent_activities` yetkisiz kullanıcılar için erişilebilir projelere göre filtreleniyor (Owner/Admin hepsini görür). Başlangıç migrasyonu (`_backfill_activity_projects`) eski aktivitelere `project_id` doldurur ve silinmiş varlıklara ait sahipsiz aktiviteleri temizler. Doğrulama: Owner 17, Üye Mert 14 aktivite (Girona/Operasyon gizli kaldı).
- ✨ **Bütçe: anında kategori ekleme**: Bütçe kalemi diyaloğunda "Yeni" ile yeni kategori tanımlanabiliyor → `POST /api/projects/{id}/budget/categories` (projeye kalıcı eklenir, otomatik seçilir).
- ✅ Test: iteration_7.json — 3/3 özellik frontend E2E %100.
- ℹ️ Not: Zaman Çizelgesi (Gantt) hâlâ salt-görünümdür; yalnızca tarih atanmış görevleri gösterir. Çizelge üzerinden sürükleyerek tarih atama bir sonraki geliştirme adayı.
- ⏳ Bekleyen (kullanıcı talebi): Uygulama içi bildirim (çan) tercihleri, sürükle-bırakla görevi alt göreve alma, Profil'de şifre değiştirme.


## Implemented — İterasyon 7 (2026-06)
- ✅ **Birleşik Ayarlar sayfası** (`/ayarlar`): sekmeli yapı — **Profil** (ad düzenleme + rol/e-posta), **Bildirimler**, **Mail** (Owner/Admin), **Çalışma Alanı** (Owner/Admin: org & workspace adı). Eski `/ayarlar/mail` artık `/ayarlar`'a yönlendiriyor. Sidebar'daki "Mail Ayarları" bağlantısı "Ayarlar" ile değiştirildi ve tüm kullanıcılara açık.
- ✅ **Emergent Mail seçeneği kaldırıldı**: Mail sekmesinde artık yalnızca Özel SMTP / Amazon SES var; sağlayıcı seçici kaldırıldı, varsayılan provider `smtp`.
- ✅ **Bildirim Tercihleri** (`GET/PUT /api/settings/notifications`): kullanıcı bazlı atama/bütçe/hatırlatma e-postası aç-kapa + **proje bazlı sessize alma**. `notif_prefs()` yardımcısı tüm e-posta gönderim noktalarında (atama, bütçe uyarısı, günlük/haftalık cron) tercih ve sessiz proje filtresi uygular.
- ✅ **Sürüklenebilir alt görevler** (TaskDrawer, framer-motion Reorder): tutamaçla yeniden sıralama (`PATCH /tasks/{id}` order) + **alt görevi ana göreve dönüştürme** (`POST /api/tasks/{id}/promote`).
- ✅ **Aktivite bildirim rozeti**: sidebar'da başkalarının okunmamış aktiviteleri için sayaç; `/aktivite` ziyaretinde localStorage `fik_activity_seen` ile sıfırlanır.
- ✅ Yeni backend uçları: `PATCH /api/profile`, `PATCH /api/organization`, `PATCH /api/workspaces/{id}`, `POST /api/tasks/{id}/promote`, `GET/PUT /api/settings/notifications`.
- ✅ Test: iteration6 backend curl doğrulandı; frontend E2E %100 (4 özellik).

## Implemented — İterasyon 3 (2026-08-19)
- ✅ **Bütçe dışa aktarma**: Excel (.xlsx / openpyxl) ve PDF (reportlab) — `GET /api/projects/{id}/budget/export?fmt=xlsx|pdf`, BudgetView'da Excel/PDF butonları (blob indirme).
- ✅ **Görev-bütçe özeti**: `GET /api/tasks/{id}` yanıtına `budget_summary` (count/planned/actual/currency); TaskDrawer'da "Bağlı Bütçe" bölümü.
- ✅ **Rol bazlı görev gizliliği**: görevlerde `visibility` (project|private) + `visible_to`; Owner/Admin hepsini görür, aksi halde sadece seçili kişiler + atananlar + oluşturan. Liste/get erişimi filtreli (yetkisiz 403). TaskDrawer'da görünürlük seçimi + kişi seçici.
- ✅ **E-posta bildirimleri (Resend, Emergent managed)**: projeye üye eklenince ve göreve atanınca otomatik e-posta (`mailer.py`, güvenlik gate'li, non-blocking). Gerçek gönderim doğrulandı.
- ✅ Komut paletine gizli DialogTitle (a11y) eklendi.
- ✅ Test: iteration3 backend 13/13, frontend UI %100.
