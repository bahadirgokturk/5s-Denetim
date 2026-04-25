# 5S Denetim Sistemi — Saueressig Türkiye

Fabrika 5S denetimleri için rol tabanlı tam yığın web uygulaması.  
**Stack:** Node 18 · Express 4 · PostgreSQL 15 · JWT (httpOnly cookie) · Vanilla JS

---

## Proje Yapısı

```
5S-Denetim/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT doğrulama, rol kontrol
│   ├── models/
│   │   ├── db.js            # pg.Pool bağlantısı
│   │   ├── schema.sql       # Tablo tanımları
│   │   └── init-db.js       # Seed: kullanıcılar + alanlar
│   ├── routes/
│   │   ├── auth.js          # /api/auth/login|logout|me
│   │   ├── areas.js         # /api/areas
│   │   ├── audits.js        # /api/audits (+ /plans)
│   │   ├── actions.js       # /api/actions
│   │   ├── users.js         # /api/users
│   │   └── dashboard.js     # /api/dashboard/stats
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── app.js           # API yardımcısı, S state, scoring, navigate
    │   ├── auth.js          # Login/logout, oturum kontrolü
    │   ├── dashboard.js     # Tüm dashboard renderları + takvim/sıralama
    │   ├── audit.js         # Denetim formu, geçmiş, PDF
    │   ├── areas.js         # Bölge yönetimi
    │   ├── actions.js       # Aksiyon takibi
    │   ├── users.js         # Kullanıcı yönetimi
    │   ├── qr.js            # QR kod oluşturma/yazdırma
    │   ├── reports.js       # Raporlar, grafik, CSV export
    │   └── init.js          # DOMContentLoaded — oturum kontrolü
    └── index.html           # HTML iskeleti (script tag'leri sona yakın)
```

---

## Kurulum (Yerel Geliştirme)

### 1 — Gereksinimler

| Araç | Sürüm |
|------|-------|
| Node.js | ≥ 18 |
| PostgreSQL | ≥ 15 |
| npm | ≥ 9 |

### 2 — Bağımlılıkları yükle

```bash
cd backend
npm install
```

### 3 — Ortam değişkenlerini ayarla

```bash
cp .env.example .env
```

`.env` dosyasını düzenle:

```env
DATABASE_URL=postgresql://KULLANICI:SIFRE@localhost:5432/5s_denetim
JWT_SECRET=en-az-32-karakter-guclu-bir-anahtar
JWT_EXPIRES_IN=8h
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5500
COOKIE_SECURE=false
```

### 4 — Veritabanını oluştur

```bash
# PostgreSQL'e bağlan ve veritabanı oluştur
psql -U postgres -c "CREATE DATABASE 5s_denetim;"

# Tabloları oluştur
psql -U postgres -d 5s_denetim -f backend/models/schema.sql

# Seed verisini yükle (kullanıcılar + 48 alan)
cd backend
node models/init-db.js
```

### 5 — Backend'i başlat

```bash
# Geliştirme (nodemon ile hot-reload)
npm run dev

# Prodüksiyon
npm start
```

Backend `http://localhost:3001` adresinde çalışır.  
Frontend dosyaları Express tarafından statik olarak servis edilir → `http://localhost:3001`

---

## Demo Hesaplar

Seed verisi aşağıdaki hesapları oluşturur:

| Kullanıcı Adı | Şifre | Rol |
|---------------|-------|-----|
| `admin` | `admin123` | 👑 Yönetici |
| `bahadir` | `bah123` | 🔍 Denetçi |
| `furkan` | `fur123` | 🔍 Denetçi |
| `izmir` | `izm123` | 🏭 Departman (İzmir) |
| `esbas` | `esb123` | 🏭 Departman (Esbaş) |
| `ispak` | `isp123` | 🏭 Departman (İspak) |
| `karaman` | `kar123` | 🏭 Departman (Karaman) |

---

## API Rotaları

### Auth
```
POST   /api/auth/login       { username, password }
POST   /api/auth/logout
GET    /api/auth/me
```

### Alanlar
```
GET    /api/areas             [rol bazlı filtre]
GET    /api/areas/:id
POST   /api/areas             [admin]
PUT    /api/areas/:id         [admin]
DELETE /api/areas/:id         [admin]
```

### Denetimler
```
GET    /api/audits            [?limit=500]
GET    /api/audits/:id
POST   /api/audits
PUT    /api/audits/:id
DELETE /api/audits/:id        [admin]

GET    /api/audits/plans/list
POST   /api/audits/plans      [admin]
PUT    /api/audits/plans/:id
DELETE /api/audits/plans/:id  [admin]
```

### Aksiyonlar
```
GET    /api/actions
GET    /api/actions/:id
POST   /api/actions           [admin, denetci]
PUT    /api/actions/:id
DELETE /api/actions/:id       [admin]
```

### Kullanıcılar
```
GET    /api/users             [admin]
GET    /api/users/auditors
GET    /api/users/:id         [admin]
POST   /api/users             [admin]
PUT    /api/users/:id         [admin]
DELETE /api/users/:id         [admin]
```

### Dashboard
```
GET    /api/dashboard/stats   [rol bazlı]
```

---

## Railway Deployment

### 1 — Railway'e bağlan

```bash
npm install -g @railway/cli
railway login
railway init
```

### 2 — PostgreSQL ekle

Railway Dashboard → **New Service → Database → PostgreSQL**  
`DATABASE_URL` otomatik olarak ortam değişkenine eklenir.

### 3 — Ortam değişkenlerini ayarla

Railway Dashboard → **Variables**:

```
DATABASE_URL   = (Railway otomatik ekler)
JWT_SECRET     = guclu-ve-uzun-gizli-anahtar-buraya
JWT_EXPIRES_IN = 8h
NODE_ENV       = production
FRONTEND_URL   = https://SENIN-APP.up.railway.app
COOKIE_SECURE  = true
```

### 4 — Deploy

```bash
railway up
```

### 5 — Veritabanı şemasını yükle

Railway Dashboard → PostgreSQL → **Query** veya:

```bash
railway run psql $DATABASE_URL -f backend/models/schema.sql
railway run node backend/models/init-db.js
```

---

## Rol Sistemi

| Rol | Yetkiler |
|-----|---------|
| `admin` | Her şeyi görür/düzenler, kullanıcı/alan/plan yönetir |
| `denetci` | Denetim yapar, kendi atamalarını görür |
| `takimlider` | Kendi fabrikasının denetimlerini/aksiyonlarını görür |
| `departman` | Takım lider ile aynı erişim; yeni denetim yapamaz |

---

## Geliştirici Notları

- **JWT** httpOnly cookie olarak saklanır (`token`). `credentials: true` ile CORS yapılandırılmıştır.
- **Fotoğraflar** base64 olarak PostgreSQL JSONB sütununda tutulur (`photos_json`).
- **Script yükleme sırası** `index.html`'de önemlidir: `app.js → auth.js → dashboard.js → audit.js → areas.js → actions.js → users.js → qr.js → reports.js → init.js`
- **Yerel geliştirme:** Frontend'i ayrı bir sunucuda (VS Code Live Server, port 5500) çalıştırıyorsanız `FRONTEND_URL=http://localhost:5500` ayarlayın ve backend proxy değil doğrudan API kullanın.
- **`S` state objesi** tüm verinin in-memory deposudur; her login'de `loadAllData()` ile API'den yeniden doldurulur.

---

## Lisans

Saueressig Türkiye · OPEX Departmanı — Dahili kullanım
