// ============================================================
// forms.js — Form şablonları (admin yönetir, herkes okuyabilir)
// ============================================================

const router = require('express').Router();
const db     = require('../models/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/forms — Tüm form şablonları
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM form_templates ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/forms — Yeni şablon oluştur (sadece admin)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { adi, aciklama, pillarlar } = req.body;
    if (!adi) return res.status(400).json({ error: 'adi zorunlu' });
    const { rows } = await db.query(
      `INSERT INTO form_templates (adi, aciklama, pillarlar, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [adi, aciklama || '', JSON.stringify(pillarlar || []), req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/forms/:id — Şablonu güncelle (sadece admin)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { adi, aciklama, pillarlar } = req.body;
    if (!adi) return res.status(400).json({ error: 'adi zorunlu' });
    const { rows } = await db.query(
      `UPDATE form_templates SET adi=$1, aciklama=$2, pillarlar=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [adi, aciklama || '', JSON.stringify(pillarlar || []), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Şablon bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/forms/:id — Şablon sil (sadece admin)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM form_templates WHERE id=$1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Şablon bulunamadı' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
