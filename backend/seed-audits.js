// ============================================================
// seed-audits.js — Örnek denetim ve aksiyon verisi ekle
// ============================================================
// Çalıştır: node seed-audits.js
// ============================================================
require('dotenv').config();
const db = require('./models/db');

const AUDITOR_1 = { id: '93854d52-06de-447e-87b2-08634f539467', name: 'Bahadır Göktürk' };
const AUDITOR_2 = { id: '94b3adb1-a16d-4e87-a04c-e749d6085009', name: 'Furkan Lafcı' };

// Alan → fabrika/dept eşlemesi
const AREAS = [
  // Esbaş Üretim
  { id: 'es-c-1', name: 'Kaba Balans',     fabrika: 'Esbaş',   dept: 'Üretim' },
  { id: 'es-c-2', name: 'Taşlama',         fabrika: 'Esbaş',   dept: 'Üretim' },
  { id: 'es-c-3', name: 'Kaynak Alanı',    fabrika: 'Esbaş',   dept: 'Üretim' },
  { id: 'es-c-4', name: 'CNC',             fabrika: 'Esbaş',   dept: 'Üretim' },
  { id: 'es-c-5', name: 'Kalite Kontrol',  fabrika: 'Esbaş',   dept: 'Üretim' },
  // İspak Üretim
  { id: 'is-g-1', name: 'CFM-Dekrom',      fabrika: 'İspak',   dept: 'Üretim' },
  { id: 'is-g-2', name: 'Otomatik Hat',    fabrika: 'İspak',   dept: 'Üretim' },
  { id: 'is-g-3', name: 'Prova',           fabrika: 'İspak',   dept: 'Üretim' },
  // İzmir Ofis
  { id: 'iz-o-1', name: 'OPEX',            fabrika: 'İzmir',   dept: 'Ofis' },
  { id: 'iz-o-2', name: 'Üretim Ofisi',    fabrika: 'İzmir',   dept: 'Ofis' },
  { id: 'iz-o-3', name: 'Planlama',        fabrika: 'İzmir',   dept: 'Ofis' },
  { id: 'iz-o-4', name: 'İnsan Kaynakları',fabrika: 'İzmir',   dept: 'Ofis' },
  { id: 'iz-o-5', name: 'Domestic Satış',  fabrika: 'İzmir',   dept: 'Ofis' },
  { id: 'iz-o-6', name: 'Tobacco Satış',   fabrika: 'İzmir',   dept: 'Ofis' },
  { id: 'iz-o-7', name: 'Export Satış',    fabrika: 'İzmir',   dept: 'Ofis' },
  { id: 'iz-o-8', name: 'Muhasebe',        fabrika: 'İzmir',   dept: 'Ofis' },
  // İzmir Operasyon
  { id: 'iz-b-1', name: 'Mekanik Bakım',   fabrika: 'İzmir',   dept: 'Operasyon' },
  { id: 'iz-b-2', name: 'Elektrik Bakım',  fabrika: 'İzmir',   dept: 'Operasyon' },
  { id: 'iz-p-1', name: 'Giriş Depo',      fabrika: 'İzmir',   dept: 'Operasyon' },
  { id: 'iz-p-2', name: 'Sevkiyat',        fabrika: 'İzmir',   dept: 'Operasyon' },
  { id: 'iz-p-3', name: 'Hammadde Depo',   fabrika: 'İzmir',   dept: 'Operasyon' },
  { id: 'iz-k-1', name: 'Kalite Kontrol',  fabrika: 'İzmir',   dept: 'Operasyon' },
  { id: 'iz-k-2', name: 'Kalite Ofisi',    fabrika: 'İzmir',   dept: 'Operasyon' },
  // İzmir Üretim
  { id: 'iz-t-1', name: '1. Grup',         fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-t-2', name: '2. Grup',         fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-t-3', name: '3. Grup',         fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-t-4', name: 'Prova',           fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-f-1', name: 'Dekrom',          fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-f-2', name: 'CFM',             fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-f-3', name: 'Bakır Kaplama/Finish', fabrika: 'İzmir', dept: 'Üretim' },
  { id: 'iz-f-4', name: 'Lazer/Etching',   fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-f-5', name: 'Gravür',          fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-f-6', name: 'Krom Kaplama/Finish', fabrika: 'İzmir', dept: 'Üretim' },
  { id: 'iz-d-1', name: 'Polish/Finish',   fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-d-2', name: 'Otomatik Hat',    fabrika: 'İzmir',   dept: 'Üretim' },
  { id: 'iz-d-3', name: 'Prova (Destek)',  fabrika: 'İzmir',   dept: 'Üretim' },
  // Karaman Üretim
  { id: 'ka-f-1', name: 'Dekrom',          fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-f-2', name: 'CFM',             fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-f-3', name: 'Bakır Kaplama',   fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-f-4', name: 'Polish/Finish',   fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-f-5', name: 'Gravür',          fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-f-6', name: 'Krom Kaplama/Finish', fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-f-7', name: 'Prova',           fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-c-1', name: 'Kaba Balans',     fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-c-2', name: 'Taşlama',         fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-c-3', name: 'Kaynak Alanı',    fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-c-4', name: 'CNC',             fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-c-5', name: 'Freze',           fabrika: 'Karaman', dept: 'Üretim' },
  { id: 'ka-c-6', name: 'Kalite Kontrol',  fabrika: 'Karaman', dept: 'Üretim' },
];

// Belirleyici ama çeşitli pillar skorları üret
function genPillars(seed) {
  const r = (min, max, s) => min + ((seed * 17 + s * 31) % (max - min + 1));
  const scores = [
    r(40, 95, 1), r(45, 92, 2), r(50, 98, 3), r(38, 90, 4), r(42, 88, 5)
  ];
  const pillars = {};
  ['S1','S2','S3','S4','S5'].forEach((id, i) => {
    const pct = Math.round(scores[i] * 10) / 10;
    pillars[id] = { pct, contribution: Math.round(pct * 20 / 100 * 10) / 10 };
  });
  const total = Math.round(Object.values(pillars).reduce((s, p) => s + p.contribution, 0));
  return { pillars, total };
}

// Son N ay geri tarih üret
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const SHIFTS = ['Sabah', 'Öğle', 'Akşam'];

async function seed() {
  console.log('🌱 Denetim seed başlıyor...');

  const audits = [];
  let seed = 1;

  for (const area of AREAS) {
    // Her alan için 2-4 denetim, son 6 ay içinde
    const count = 2 + (seed % 3); // 2, 3, veya 4
    for (let i = 0; i < count; i++) {
      const { pillars, total } = genPillars(seed);
      const auditor = seed % 2 === 0 ? AUDITOR_1 : AUDITOR_2;
      // İlk audit'i güncel aya yakın, diğerlerini daha eski tarihlere koy
      const daysBack = (i === 0)
        ? ((seed - 1) * 7) % 31     // 0-30 gün önce (bazıları bu ay, bazıları geçen ay)
        : 32 + (seed * 19 + i * 47) % 150;  // 32-181 gün önce
      const date = daysAgo(daysBack);
      const shift = SHIFTS[seed % 3];

      audits.push({
        area_id: area.id,
        area_name: area.name,
        auditor_id: auditor.id,
        auditor_name: auditor.name,
        date,
        shift,
        total_score: total,
        pillars_json: pillars,
        answers_json: {},
        notes_json: {},
        photos_json: {},
        status: 'tamamlandi',
        form_code: `5S-2025-${String(seed).padStart(3,'0')}`,
        location: area.fabrika,
        team_leader: '',
      });
      seed++;
    }
  }

  console.log(`  ${audits.length} denetim eklenecek...`);

  const auditIds = [];
  for (const a of audits) {
    const { rows } = await db.query(
      `INSERT INTO audits
         (area_id, area_name, auditor_id, auditor_name, date, shift, total_score,
          pillars_json, answers_json, notes_json, photos_json, status, form_code, location, team_leader)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, area_id, area_name, total_score`,
      [
        a.area_id, a.area_name, a.auditor_id, a.auditor_name,
        a.date, a.shift, a.total_score,
        JSON.stringify(a.pillars_json), JSON.stringify(a.answers_json),
        JSON.stringify(a.notes_json), JSON.stringify(a.photos_json),
        a.status, a.form_code, a.location, a.team_leader,
      ]
    );
    auditIds.push(rows[0]);
    process.stdout.write('.');
  }
  console.log('\n  ✓ Denetimler eklendi');

  // Aksiyonlar — düşük skorlu denetimler için
  const lowScoreAudits = auditIds.filter(a => a.total_score < 65).slice(0, 20);
  const PRIORITIES = ['Düşük','Orta','Yüksek','Kritik'];
  const DESCRIPTIONS = [
    'Makine üzerindeki gereksiz malzemeler temizlenmeli',
    'Alan tanımları güncellenmesi gerekiyor',
    'Zemin temizliği eksik, periyodik temizlik planı yapılmalı',
    'Etiketleme ve işaretlemeler standartlara uygun değil',
    'Ekipman bakım talimatları güncellenmeli',
    'SOF formları güncellenmemiş, revize edilmeli',
    'Yangın tüpü erişim yolu kapalı, açılmalı',
    'Yıpranmış zemin bantları yenilenmeli',
    'Raflar üzerindeki fazla stok azaltılmalı',
    'Acil durum çıkış yolu önündeki malzemeler kaldırılmalı',
  ];

  let actSeed = 0;
  for (const audit of lowScoreAudits) {
    const desc = DESCRIPTIONS[actSeed % DESCRIPTIONS.length];
    const prio = PRIORITIES[actSeed % 4];
    const dueDate = daysAgo(-(15 + actSeed * 5)); // gelecekte
    const status = actSeed % 3 === 0 ? 'Tamamlandı' : actSeed % 3 === 1 ? 'Devam Ediyor' : 'Açık';
    await db.query(
      `INSERT INTO actions (audit_id, area_id, area_name, description, assigned_to, due_date, status, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [audit.id, audit.area_id, audit.area_name, desc, AUDITOR_1.name,
       dueDate, status, prio]
    );
    actSeed++;
  }
  console.log(`  ✓ ${lowScoreAudits.length} aksiyon eklendi`);
  console.log('\n✅ Seed tamamlandı!');
  console.log(`   ${audits.length} denetim, ${lowScoreAudits.length} aksiyon`);
  process.exit(0);
}

seed().catch(err => { console.error('❌ Hata:', err.message); process.exit(1); });
