require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes    = require('./routes/auth');
const auditsRoutes  = require('./routes/audits');
const areasRoutes   = require('./routes/areas');
const usersRoutes   = require('./routes/users');
const actionsRoutes = require('./routes/actions');
const dashRoutes    = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Güvenlik başlıkları ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// ── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5500',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: izin verilmeyen kaynak — ' + origin));
  },
  credentials: true,
}));

// ── Body / Cookie parsers ─────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Static — Frontend dosyalarını sun ────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/audits',    auditsRoutes);
app.use('/api/areas',     areasRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/actions',   actionsRoutes);
app.use('/api/dashboard', dashRoutes);

// ── SPA fallback ─────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Global hata yakalayıcı ───────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  res.status(status).json({ error: err.message || 'Sunucu hatası' });
});

app.listen(PORT, () => {
  console.log(`🚀 5S Denetim Backend — port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;
