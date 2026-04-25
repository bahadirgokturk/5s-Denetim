const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../models/db');
const { verifyToken } = require('../middleware/auth');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000, // 8 saat
};

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });

    const { rows } = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });

    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      dept: user.dept,
      fabrika: user.fabrika,
      bolum: user.bolum,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user: payload, token });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, name, role, dept, fabrika, bolum FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
