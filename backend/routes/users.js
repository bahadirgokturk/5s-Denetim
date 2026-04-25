const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const db      = require('../models/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken);

const SAFE_COLS = 'id, username, name, role, dept, fabrika, bolum, created_at';

// GET /api/users — Sadece admin tüm listesi görebilir
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT ${SAFE_COLS} FROM users ORDER BY role, name`);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/users/auditors — Denetçi listesi (admin + herkes form doldurmak için)
router.get('/auditors', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${SAFE_COLS} FROM users WHERE role='denetci' ORDER BY name`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/users/:id
router.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT ${SAFE_COLS} FROM users WHERE id=$1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/users — Yeni kullanıcı oluştur (sadece admin)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { username, password, name, role, dept, fabrika, bolum } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'username, password, name, role zorunlu' });
    }

    const validRoles = ['admin','denetci','departman','takimlider'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Geçersiz rol' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (username, password_hash, name, role, dept, fabrika, bolum)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${SAFE_COLS}`,
      [username.toLowerCase().trim(), hash, name, role, dept || '', fabrika || '', bolum || '']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanımda' });
    next(err);
  }
});

// PUT /api/users/:id — Kullanıcı güncelle (sadece admin)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, role, dept, fabrika, bolum, password } = req.body;

    // Şifre değiştirilmek isteniyorsa
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET password_hash=$1 WHERE id=$2',
        [hash, req.params.id]
      );
    }

    const { rows } = await db.query(
      `UPDATE users SET name=$1, role=$2, dept=$3, fabrika=$4, bolum=$5
       WHERE id=$6 RETURNING ${SAFE_COLS}`,
      [name, role, dept || '', fabrika || '', bolum || '', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — Kullanıcı sil (sadece admin, kendini silemez)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
    }
    const { rowCount } = await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
