// Veritabanını başlat: schema oluştur + seed verilerini ekle
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const SEED_USERS = [
  { username:'admin',     password:'admin123', name:'Bahadır Göktürk',  role:'admin',     dept:'',          fabrika:'',        bolum:'' },
  { username:'bahadir',   password:'bah123',   name:'Bahadır Göktürk',  role:'denetci',   dept:'',          fabrika:'',        bolum:'' },
  { username:'furkan',    password:'fur123',   name:'Furkan Lafcı',      role:'denetci',   dept:'',          fabrika:'',        bolum:'' },
  { username:'izmir',     password:'izm123',   name:'İzmir Üretim',      role:'departman', dept:'Üretim',    fabrika:'İzmir',   bolum:'' },
  { username:'operasyon', password:'ops123',   name:'İzmir Operasyon',   role:'departman', dept:'Operasyon', fabrika:'İzmir',   bolum:'' },
  { username:'ofis',      password:'ofi123',   name:'İzmir Ofis',        role:'departman', dept:'Ofis',      fabrika:'İzmir',   bolum:'' },
  { username:'esbas',     password:'esb123',   name:'Esbaş',             role:'departman', dept:'Üretim',    fabrika:'Esbaş',   bolum:'' },
  { username:'ispak',     password:'isp123',   name:'İspak',             role:'departman', dept:'Üretim',    fabrika:'İspak',   bolum:'' },
  { username:'karaman',   password:'kar123',   name:'Karaman',           role:'departman', dept:'Üretim',    fabrika:'Karaman', bolum:'' },
];

const SEED_AREAS = [
  {id:'iz-t-1', name:'1. Grup',             dept:'Üretim',    alt_dept:'Tobacco',       fabrika:'İzmir'},
  {id:'iz-t-2', name:'2. Grup',             dept:'Üretim',    alt_dept:'Tobacco',       fabrika:'İzmir'},
  {id:'iz-t-3', name:'3. Grup',             dept:'Üretim',    alt_dept:'Tobacco',       fabrika:'İzmir'},
  {id:'iz-t-4', name:'Prova',               dept:'Üretim',    alt_dept:'Tobacco',       fabrika:'İzmir'},
  {id:'iz-f-1', name:'Dekrom',              dept:'Üretim',    alt_dept:'Flexible',      fabrika:'İzmir'},
  {id:'iz-f-2', name:'CFM',                 dept:'Üretim',    alt_dept:'Flexible',      fabrika:'İzmir'},
  {id:'iz-f-3', name:'Bakır Kaplama/Finish',dept:'Üretim',    alt_dept:'Flexible',      fabrika:'İzmir'},
  {id:'iz-f-4', name:'Lazer/Etching',       dept:'Üretim',    alt_dept:'Flexible',      fabrika:'İzmir'},
  {id:'iz-f-5', name:'Gravür',              dept:'Üretim',    alt_dept:'Flexible',      fabrika:'İzmir'},
  {id:'iz-f-6', name:'Krom Kaplama/Finish', dept:'Üretim',    alt_dept:'Flexible',      fabrika:'İzmir'},
  {id:'iz-d-1', name:'Polish/Finish',       dept:'Üretim',    alt_dept:'Destek',        fabrika:'İzmir'},
  {id:'iz-d-2', name:'Otomatik Hat',        dept:'Üretim',    alt_dept:'Destek',        fabrika:'İzmir'},
  {id:'iz-d-3', name:'Prova (Destek)',      dept:'Üretim',    alt_dept:'Destek',        fabrika:'İzmir'},
  {id:'iz-b-1', name:'Mekanik Bakım',       dept:'Operasyon', alt_dept:'Bakım',         fabrika:'İzmir'},
  {id:'iz-b-2', name:'Elektrik Bakım',      dept:'Operasyon', alt_dept:'Bakım',         fabrika:'İzmir'},
  {id:'iz-p-1', name:'Giriş Depo',          dept:'Operasyon', alt_dept:'Planlama',      fabrika:'İzmir'},
  {id:'iz-p-2', name:'Sevkiyat',            dept:'Operasyon', alt_dept:'Planlama',      fabrika:'İzmir'},
  {id:'iz-p-3', name:'Hammadde Depo',       dept:'Operasyon', alt_dept:'Planlama',      fabrika:'İzmir'},
  {id:'iz-k-1', name:'Kalite Kontrol',      dept:'Operasyon', alt_dept:'Kalite',        fabrika:'İzmir'},
  {id:'iz-k-2', name:'Kalite Ofisi',        dept:'Operasyon', alt_dept:'Kalite',        fabrika:'İzmir'},
  {id:'iz-o-1', name:'OPEX',                dept:'Ofis',      alt_dept:'Ofis',          fabrika:'İzmir'},
  {id:'iz-o-2', name:'Üretim Ofisi',        dept:'Ofis',      alt_dept:'Ofis',          fabrika:'İzmir'},
  {id:'iz-o-3', name:'Planlama',            dept:'Ofis',      alt_dept:'Ofis',          fabrika:'İzmir'},
  {id:'iz-o-4', name:'İnsan Kaynakları',    dept:'Ofis',      alt_dept:'Ofis',          fabrika:'İzmir'},
  {id:'iz-o-5', name:'Domestic Satış',      dept:'Ofis',      alt_dept:'Ofis',          fabrika:'İzmir'},
  {id:'iz-o-6', name:'Tobacco Satış',       dept:'Ofis',      alt_dept:'Ofis',          fabrika:'İzmir'},
  {id:'iz-o-7', name:'Export Satış',        dept:'Ofis',      alt_dept:'Ofis',          fabrika:'İzmir'},
  {id:'iz-o-8', name:'Muhasebe',            dept:'Ofis',      alt_dept:'Ofis',          fabrika:'İzmir'},
  {id:'es-c-1', name:'Kaba Balans',         dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Esbaş'},
  {id:'es-c-2', name:'Taşlama',             dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Esbaş'},
  {id:'es-c-3', name:'Kaynak Alanı',        dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Esbaş'},
  {id:'es-c-4', name:'CNC',                 dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Esbaş'},
  {id:'es-c-5', name:'Kalite Kontrol',      dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Esbaş'},
  {id:'is-g-1', name:'CFM-Dekrom',          dept:'Üretim',    alt_dept:'Genel Üretim',  fabrika:'İspak'},
  {id:'is-g-2', name:'Otomatik Hat',        dept:'Üretim',    alt_dept:'Genel Üretim',  fabrika:'İspak'},
  {id:'is-g-3', name:'Prova',               dept:'Üretim',    alt_dept:'Genel Üretim',  fabrika:'İspak'},
  {id:'ka-f-1', name:'Dekrom',              dept:'Üretim',    alt_dept:'Flex/Tob',      fabrika:'Karaman'},
  {id:'ka-f-2', name:'CFM',                 dept:'Üretim',    alt_dept:'Flex/Tob',      fabrika:'Karaman'},
  {id:'ka-f-3', name:'Bakır Kaplama',       dept:'Üretim',    alt_dept:'Flex/Tob',      fabrika:'Karaman'},
  {id:'ka-f-4', name:'Polish/Finish',       dept:'Üretim',    alt_dept:'Flex/Tob',      fabrika:'Karaman'},
  {id:'ka-f-5', name:'Gravür',              dept:'Üretim',    alt_dept:'Flex/Tob',      fabrika:'Karaman'},
  {id:'ka-f-6', name:'Krom Kaplama/Finish', dept:'Üretim',    alt_dept:'Flex/Tob',      fabrika:'Karaman'},
  {id:'ka-f-7', name:'Prova',               dept:'Üretim',    alt_dept:'Flex/Tob',      fabrika:'Karaman'},
  {id:'ka-c-1', name:'Kaba Balans',         dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Karaman'},
  {id:'ka-c-2', name:'Taşlama',             dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Karaman'},
  {id:'ka-c-3', name:'Kaynak Alanı',        dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Karaman'},
  {id:'ka-c-4', name:'CNC',                 dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Karaman'},
  {id:'ka-c-5', name:'Freze',               dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Karaman'},
  {id:'ka-c-6', name:'Kalite Kontrol',      dept:'Üretim',    alt_dept:'Çelik Üretim',  fabrika:'Karaman'},
];

async function init() {
  try {
    console.log('📦 Şema oluşturuluyor...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('✅ Şema hazır');

    console.log('👤 Kullanıcılar seed ediliyor...');
    for (const u of SEED_USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      await db.query(`
        INSERT INTO users (username, password_hash, name, role, dept, fabrika, bolum)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (username) DO UPDATE SET
          password_hash=$2, name=$3, role=$4, dept=$5, fabrika=$6, bolum=$7
      `, [u.username, hash, u.name, u.role, u.dept, u.fabrika, u.bolum]);
    }
    console.log(`✅ ${SEED_USERS.length} kullanıcı eklendi`);

    console.log('🏭 Bölgeler seed ediliyor...');
    for (const a of SEED_AREAS) {
      await db.query(`
        INSERT INTO areas (id, name, dept, alt_dept, fabrika)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id) DO UPDATE SET name=$2, dept=$3, alt_dept=$4, fabrika=$5
      `, [a.id, a.name, a.dept, a.alt_dept, a.fabrika]);
    }
    console.log(`✅ ${SEED_AREAS.length} bölge eklendi`);

    console.log('\n🎉 Veritabanı hazır! Sunucuyu başlatabilirsiniz: npm start');
    process.exit(0);
  } catch (err) {
    console.error('❌ Init hatası:', err.message);
    process.exit(1);
  }
}

init();
