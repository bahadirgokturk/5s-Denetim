const router = require('express').Router();
const db     = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/actions — Rol bazlı aksiyon listesi
router.get('/', async (req, res, next) => {
  try {
    let sql = `
      SELECT ac.*, ar.fabrika AS area_fabrika, ar.dept AS area_dept
      FROM actions ac
      LEFT JOIN areas ar ON ar.id = ac.area_id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'departman' || req.user.role === 'takimlider') {
      // Fabrika + dept bazlı (dept boşsa sadece fabrika)
      if (req.user.fabrika) {
        sql += ` AND ar.fabrika = $${params.length + 1}`;
        params.push(req.user.fabrika);
      }
      if (req.user.dept) {
        sql += ` AND ar.dept = $${params.length + 1}`;
        params.push(req.user.dept);
      }
    } else if (req.user.role === 'denetci') {
      // Denetçi: kendi denetimlerinden doğan aksiyonlar
      sql += ` AND EXISTS (
        SELECT 1 FROM audits a WHERE a.id = ac.audit_id AND a.auditor_id = $${params.length + 1}
      )`;
      params.push(req.user.id);
    }

    const { status } = req.query;
    if (status) { sql += ` AND ac.status = $${params.length + 1}`; params.push(status); }

    sql += ' ORDER BY ac.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/actions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM actions WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Aksiyon bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/actions — Yeni aksiyon (admin + denetci)
router.post('/', requireRole('admin', 'denetci'), async (req, res, next) => {
  try {
    const { audit_id, area_id, area_name, description, assigned_to, due_date, status, priority } = req.body;
    if (!description) return res.status(400).json({ error: 'description zorunlu' });

    const { rows } = await db.query(
      `INSERT INTO actions (audit_id, area_id, area_name, description, assigned_to, due_date, status, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [audit_id || null, area_id || null, area_name || '',
       description, assigned_to || '', due_date || null,
       status || 'Açık', priority || 'Orta']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/actions/:id — Aksiyon güncelle
router.put('/:id', async (req, res, next) => {
  try {
    const { description, assigned_to, due_date, status, priority, area_id, area_name } = req.body;
    const { rows } = await db.query(
      `UPDATE actions SET description=$1, assigned_to=$2, due_date=$3, status=$4, priority=$5,
         area_id=COALESCE($6, area_id), area_name=COALESCE($7, area_name)
       WHERE id=$8 RETURNING *`,
      [description, assigned_to || '', due_date || null, status || 'Açık', priority || 'Orta',
       area_id || null, area_name || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Aksiyon bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/actions/:id — Sadece admin
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM actions WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Aksiyon bulunamadı' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
