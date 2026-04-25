const router = require('express').Router();
const db     = require('../models/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

// Denetim listesi için temel sorgu
const BASE_SELECT = `
  SELECT a.*, ar.name AS area_name_db, ar.dept, ar.alt_dept, ar.fabrika AS area_fabrika
  FROM audits a
  LEFT JOIN areas ar ON ar.id = a.area_id
`;

// GET /api/audits — Role'e göre filtreli denetim listesi
router.get('/', async (req, res, next) => {
  try {
    const { fabrika, dept, from, to, status, limit = 200, offset = 0 } = req.query;
    const params = [];
    const where  = [];
    let   pidx   = 1;

    // Rol bazlı kısıtlama
    if (req.user.role === 'denetci') {
      where.push(`a.auditor_id = $${pidx++}`);
      params.push(req.user.id);
    } else if (req.user.role === 'departman' || req.user.role === 'takimlider') {
      where.push(`ar.fabrika = $${pidx++}`);
      params.push(req.user.fabrika);
      if (req.user.dept) {
        where.push(`ar.dept = $${pidx++}`);
        params.push(req.user.dept);
      }
    }

    // Filtreler
    if (fabrika) { where.push(`ar.fabrika = $${pidx++}`); params.push(fabrika); }
    if (dept)    { where.push(`ar.dept = $${pidx++}`);    params.push(dept); }
    if (status)  { where.push(`a.status = $${pidx++}`);   params.push(status); }
    if (from)    { where.push(`a.date >= $${pidx++}`);    params.push(from); }
    if (to)      { where.push(`a.date <= $${pidx++}`);    params.push(to); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const sql = `${BASE_SELECT} ${whereClause} ORDER BY a.date DESC LIMIT $${pidx++} OFFSET $${pidx}`;
    params.push(Number(limit), Number(offset));

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/audits/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `${BASE_SELECT} WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Denetim bulunamadı' });

    // Departman rolü kendi fabrikasını görebilir
    const audit = rows[0];
    if (req.user.role === 'departman' && audit.area_fabrika !== req.user.fabrika) {
      return res.status(403).json({ error: 'Bu denetime erişim yetkiniz yok' });
    }
    if (req.user.role === 'denetci' && audit.auditor_id !== req.user.id) {
      return res.status(403).json({ error: 'Bu denetime erişim yetkiniz yok' });
    }
    res.json(audit);
  } catch (err) { next(err); }
});

// POST /api/audits — Yeni denetim kaydet (admin + denetci)
router.post('/', requireRole('admin', 'denetci'), async (req, res, next) => {
  try {
    const {
      area_id, area_name, date, shift, total_score,
      pillars_json, answers_json, notes_json, photos_json,
      status, form_code, location, team_leader,
    } = req.body;

    if (!area_id || !date) return res.status(400).json({ error: 'area_id ve date zorunlu' });

    const auditorId   = req.user.id;
    const auditorName = req.user.name;

    const { rows } = await db.query(
      `INSERT INTO audits
         (area_id, area_name, auditor_id, auditor_name, date, shift, total_score,
          pillars_json, answers_json, notes_json, photos_json, status, form_code, location, team_leader)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        area_id, area_name || '', auditorId, auditorName,
        date, shift || '', total_score || 0,
        JSON.stringify(pillars_json || {}),
        JSON.stringify(answers_json || {}),
        JSON.stringify(notes_json || {}),
        JSON.stringify(photos_json || {}),
        status || 'tamamlandi',
        form_code || '', location || '', team_leader || '',
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/audits/:id — Denetim güncelle
router.put('/:id', requireRole('admin', 'denetci'), async (req, res, next) => {
  try {
    const { rows: existing } = await db.query('SELECT * FROM audits WHERE id=$1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Denetim bulunamadı' });

    // Denetçi sadece kendi denetimini güncelleyebilir
    if (req.user.role === 'denetci' && existing[0].auditor_id !== req.user.id) {
      return res.status(403).json({ error: 'Bu denetime erişim yetkiniz yok' });
    }

    const {
      area_id, area_name, date, shift, total_score,
      pillars_json, answers_json, notes_json, photos_json,
      status, form_code, location, team_leader,
    } = req.body;

    const { rows } = await db.query(
      `UPDATE audits SET
         area_id=$1, area_name=$2, date=$3, shift=$4, total_score=$5,
         pillars_json=$6, answers_json=$7, notes_json=$8, photos_json=$9,
         status=$10, form_code=$11, location=$12, team_leader=$13
       WHERE id=$14 RETURNING *`,
      [
        area_id || existing[0].area_id,
        area_name || existing[0].area_name,
        date || existing[0].date,
        shift !== undefined ? shift : existing[0].shift,
        total_score !== undefined ? total_score : existing[0].total_score,
        JSON.stringify(pillars_json || existing[0].pillars_json),
        JSON.stringify(answers_json || existing[0].answers_json),
        JSON.stringify(notes_json   || existing[0].notes_json),
        JSON.stringify(photos_json  || existing[0].photos_json),
        status || existing[0].status,
        form_code   || existing[0].form_code,
        location    || existing[0].location,
        team_leader || existing[0].team_leader,
        req.params.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/audits/:id — Sadece admin
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM audits WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Denetim bulunamadı' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Audit Plans (Atamalar) ────────────────────────────────────────

// GET /api/audits/plans/list
router.get('/plans/list', async (req, res, next) => {
  try {
    let sql = 'SELECT * FROM audit_plans WHERE 1=1';
    const params = [];

    if (req.user.role === 'denetci') {
      sql += ` AND auditor_id = $${params.length + 1}`;
      params.push(req.user.id);
    }
    sql += ' ORDER BY planned_date ASC';

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/audits/plans — Denetim ataması oluştur (sadece admin)
router.post('/plans', requireRole('admin'), async (req, res, next) => {
  try {
    const { area_id, area_name, auditor_id, auditor_name, planned_date, shift, form_template_id, notes } = req.body;
    if (!area_id || !auditor_id || !planned_date) {
      return res.status(400).json({ error: 'area_id, auditor_id, planned_date zorunlu' });
    }

    const { rows } = await db.query(
      `INSERT INTO audit_plans
         (area_id, area_name, auditor_id, auditor_name, planned_date, shift, form_template_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [area_id, area_name || '', auditor_id, auditor_name || '', planned_date,
       shift || '', form_template_id || 'default', notes || '', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/audits/plans/:id
router.put('/plans/:id', requireRole('admin', 'denetci'), async (req, res, next) => {
  try {
    const { status, completed_audit_id } = req.body;
    const { rows } = await db.query(
      `UPDATE audit_plans SET status=$1, completed_audit_id=$2 WHERE id=$3 RETURNING *`,
      [status, completed_audit_id || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Atama bulunamadı' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/audits/plans/:id
router.delete('/plans/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM audit_plans WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Atama bulunamadı' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
