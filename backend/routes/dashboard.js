const router = require('express').Router();
const db     = require('../models/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/dashboard/stats — Dashboard istatistikleri (rol bazlı)
router.get('/stats', async (req, res, next) => {
  try {
    const { fabrika, dept, from, to } = req.query;
    const params = [];
    const where  = [];
    let pidx = 1;

    // Rol kısıtlamaları
    if (req.user.role === 'denetci') {
      where.push(`a.auditor_id = $${pidx++}`);
      params.push(req.user.id);
    } else if (req.user.role === 'departman' || req.user.role === 'takimlider') {
      where.push(`ar.fabrika = $${pidx++}`);
      params.push(req.user.fabrika);
    }

    // Filtreler
    if (fabrika) { where.push(`ar.fabrika = $${pidx++}`); params.push(fabrika); }
    if (dept)    { where.push(`ar.dept = $${pidx++}`);    params.push(dept); }
    if (from)    { where.push(`a.date >= $${pidx++}`);    params.push(from); }
    if (to)      { where.push(`a.date <= $${pidx++}`);    params.push(to); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // Genel istatistikler
    const statsQ = await db.query(`
      SELECT
        COUNT(*)::int AS total_audits,
        COALESCE(ROUND(AVG(a.total_score)::numeric, 1), 0) AS avg_score,
        COALESCE(MAX(a.total_score), 0) AS max_score,
        COALESCE(MIN(a.total_score), 0) AS min_score
      FROM audits a
      LEFT JOIN areas ar ON ar.id = a.area_id
      ${whereClause}
    `, params);

    // Açık aksiyon sayısı
    const actionsQ = await db.query(`
      SELECT COUNT(*)::int AS open_actions
      FROM actions ac
      LEFT JOIN areas ar ON ar.id = ac.area_id
      WHERE ac.status = 'Açık'
      ${req.user.role === 'departman' ? "AND ar.fabrika = '" + req.user.fabrika + "'" : ''}
      ${req.user.role === 'denetci' ? "AND EXISTS (SELECT 1 FROM audits a WHERE a.id=ac.audit_id AND a.auditor_id='" + req.user.id + "')" : ''}
    `);

    // En iyi bölge
    const bestQ = await db.query(`
      SELECT ar.name AS area_name, ROUND(AVG(a.total_score)::numeric, 1) AS avg_score
      FROM audits a
      LEFT JOIN areas ar ON ar.id = a.area_id
      ${whereClause}
      GROUP BY ar.name ORDER BY avg_score DESC LIMIT 1
    `, params);

    // Bölge bazlı ortalamalar
    const areaStatsQ = await db.query(`
      SELECT ar.id, ar.name, ar.dept, ar.alt_dept, ar.fabrika,
             COUNT(a.id)::int AS audit_count,
             ROUND(AVG(a.total_score)::numeric, 1) AS avg_score,
             MAX(a.date) AS last_audit_date
      FROM areas ar
      LEFT JOIN audits a ON a.area_id = ar.id
      GROUP BY ar.id, ar.name, ar.dept, ar.alt_dept, ar.fabrika
      ORDER BY ar.fabrika, ar.dept, ar.name
    `);

    // Son 6 ay trend (pillar ortalamaları)
    const trendQ = await db.query(`
      SELECT
        TO_CHAR(a.date, 'YYYY-MM') AS month,
        ROUND(AVG(a.total_score)::numeric, 1) AS avg_score,
        COUNT(*)::int AS count
      FROM audits a
      LEFT JOIN areas ar ON ar.id = a.area_id
      ${whereClause}
      GROUP BY month ORDER BY month DESC LIMIT 6
    `, params);

    res.json({
      stats:    statsQ.rows[0],
      actions:  actionsQ.rows[0],
      best:     bestQ.rows[0] || null,
      areas:    areaStatsQ.rows,
      trend:    trendQ.rows.reverse(),
    });
  } catch (err) { next(err); }
});

module.exports = router;
