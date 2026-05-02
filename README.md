# 5S Denetim Sistemi — Kurulum ve Kullanım Kılavuzu

Fabrika sahalarında 5S denetimlerini dijital ortamda yönetmek için geliştirilmiş şirket içi web uygulaması.

---

## Sistem Gereksinimleri

| Bileşen | Minimum Sürüm |
|---|---|
| Node.js | v18+ |
| PostgreSQL | v14+ |
| İşletim Sistemi | Windows Server 2016+ / Ubuntu 20.04+ |
| RAM | 1 GB (önerilen 2 GB) |
| Disk | 500 MB |

---

## Kurulum Adımları

### 1. Projeyi sunucuya kopyalayın

```bash
git clone https://github.com/bahadirgokturk/5s-Denetim.git
cd 5s-Denetim
```

veya ZIP olarak indirip sunucuya aktarın.

---

### 2. Bağımlılıkları yükleyin

```bash
cd backend
npm install
```

---

### 3. Veritabanını oluşturun

PostgreSQL'e bağlanıp yeni veritabanı oluşturun:

```sql
CREATE DATABASE s5_denetim;
```

---

### 4. `.env` dosyasını oluşturun

`backend/` klasörüne `.env` adında bir dosya oluşturun ve aşağıdaki içeriği yazın:

```env
# Veritabanı bağlantısı
DATABASE_URL=postgresql://KULLANICI_ADI:SIFRE@localhost:5432/s5_denetim

# Güvenlik anahtarı — MUTLAKA değiştirin (aşağıdaki komutla üretin)
JWT_SECRET=BURAYA_URETILEN_DEGERI_YAZIN
JWT_EXPIRES_IN=8h

# Sunucu
PORT=3001
NODE_ENV=production

# Erişim adresi (sunucunun IP veya hostname'i)
FRONTEND_URL=http://192.168.1.100:3001

# HTTPS kullanılıyorsa true yapın, HTTP ise false bırakın
COOKIE_SECURE=false
```

**JWT_SECRET üretmek için** (PowerShell veya terminal'de çalıştırın):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Çıkan değeri kopyalayıp `JWT_SECRET=` satırına yapıştırın.

---

### 5. Veritabanı tablolarını ve başlangıç verilerini oluşturun

```bash
cd backend
node models/init-db.js
```

Bu komut tüm tabloları, kullanıcıları ve fabrika alanlarını otomatik oluşturur.

---

### 6. Sunucuyu başlatın

**Test için (tek seferlik):**
```bash
node server.js
```

**Kalıcı çalıştırmak için pm2 kullanın:**
```bash
npm install -g pm2
pm2 start server.js --name "5s-denetim"
pm2 save
pm2 startup
```

pm2 sayesinde sunucu yeniden başlatılsa bile uygulama otomatik ayağa kalkar.

---

### 7. Erişim ve test

Kurulum tamamlandıktan sonra tarayıcıdan açın:

```
http://SUNUCU_IP_ADRESI:3001
```

Şirket ağındaki tüm bilgisayar ve telefonlar bu adrese erişebilir.

---

## İlk Giriş ve Şifre Değişikliği

Kurulum sonrası sisteme **admin** kullanıcısıyla girin.

> ⚠️ **Güvenlik:** İlk girişten sonra tüm kullanıcıların şifresini değiştirin.  
> Admin Paneli → Kullanıcılar → Kullanıcı seç → Düzenle

Varsayılan kullanıcı adları:

| Kullanıcı Adı | Rol | Erişim |
|---|---|---|
| `admin` | Yönetici | Tüm sistem |
| `bahadir` | Denetçi | Denetim yapma |
| `furkan` | Denetçi | Denetim yapma |
| `izmir` | Departman | İzmir Üretim |
| `operasyon` | Departman | İzmir Operasyon |
| `ofis` | Departman | İzmir Ofis |
| `esbas` | Departman | Esbaş |
| `ispak` | Departman | İspak |
| `karaman` | Departman | Karaman |

---

## Güvenlik Duvarı / Port Ayarı

Uygulama **3001** numaralı portta çalışır.  
Şirket ağından erişim için bu portun açık olması gerekir.

80 veya 443 portuna yönlendirmek istiyorsanız Nginx reverse proxy kurulabilir.

---

## Yedekleme

Veritabanını yedeklemek için:

```bash
pg_dump s5_denetim > yedek_2026_01_01.sql
```

Otomatik günlük yedek için Windows Görev Zamanlayıcısı veya Linux cron kullanılabilir.

---

## Güncelleme

Yeni sürüm geldiğinde:

```bash
git pull origin main
cd backend
npm install
pm2 restart 5s-denetim
```

---

## Sorun Giderme

**Uygulama açılmıyor:**
```bash
pm2 logs 5s-denetim
```
Hata mesajını inceleyin.

**Veritabanı bağlantı hatası:**
- `.env` dosyasındaki `DATABASE_URL` bilgilerini kontrol edin
- PostgreSQL servisinin çalıştığını doğrulayın
- Kullanıcının `s5_denetim` veritabanına erişim yetkisi olduğunu kontrol edin

**Port kullanımda hatası:**
- `.env` dosyasında `PORT=3002` yaparak farklı port kullanabilirsiniz

---

## Proje Yapısı (Geliştirici Referansı)

```
5S-Denetim/
├── backend/
│   ├── middleware/auth.js       # JWT doğrulama, rol kontrolü
│   ├── models/
│   │   ├── db.js                # Veritabanı bağlantısı
│   │   ├── schema.sql           # Tablo tanımları
│   │   └── init-db.js           # İlk kurulum verisi
│   ├── routes/                  # API endpoint'leri
│   └── server.js                # Ana sunucu dosyası
└── frontend/
    ├── css/style.css
    ├── js/                      # Uygulama modülleri
    └── index.html               # Tek sayfa uygulama
```

---

## İletişim

**Geliştirici:** Bahadır Göktürk — OPEX Departmanı  
**GitHub:** [github.com/bahadirgokturk/5s-Denetim](https://github.com/bahadirgokturk/5s-Denetim)
