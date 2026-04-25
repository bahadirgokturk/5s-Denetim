const router = require('express').Router();
const db     = require('../models/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Tüm istekler doğrulama gerektirir
router.use(verifyToken);

// GET /api/areas — Bölgeleri listele (role'e göre filtrele)
router.get('/', async (req, res, next) => {
  try {
    let query = 'SELECT * FROM areas ORDER BY fabrika, dept, alt_dept, name';
    const params = [];

    // Departman rolü: sadece kendi fabrikasını görebilir
    if (req.user.role === 'departman' || req.user.role === 'takimlider') {
      query = 'SELECT * FROM areas WHERE fabrika = $1 ORDER BY dept, alt_dept, name';
      params.push(req.user.fabrika);
    }

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/areas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM areas WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Bölge bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/areas — Yeni bölge oluştur (sadece admin)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { id, name, dept, alt_dept, fabrika, description } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id ve name zorunlu' });

    const { rows } = await db.query(
      `INSERT INTO areas (id, name, dept, alt_dept, fabrika, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, name, dept || '', alt_dept || '', fabrika || '', description || '']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu ID zaten kullanımda' });
    next(err);
  }
});

// PUT /api/areas/:id — Bölge güncelle (sadece admin)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, dept, alt_dept, fabrika, description } = req.body;
    const { rows } = await db.query(
      `UPDATE areas SET name=$1, dept=$2, alt_dept=$3, fabrika=$4, description=$5
       WHERE id=$6 RETURNING *`,
      [name, dept || '', alt_dept || '', fabrika || '', description || '', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Bölge bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/areas/:id — Bölge sil (sadece admin)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM areas WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Bölge bulunamadı' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
