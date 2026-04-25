-- 5S Denetim Sistemi — PostgreSQL Şema
-- Saueressig Türkiye · OPEX

-- Uzantılar
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLOLAR
-- ============================================================

-- Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(128) NOT NULL,
  role          VARCHAR(32) NOT NULL CHECK (role IN ('admin','denetci','departman','takimlider')),
  dept          VARCHAR(128) DEFAULT '',
  fabrika       VARCHAR(128) DEFAULT '',
  bolum         VARCHAR(128) DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Fabrikalar
CREATE TABLE IF NOT EXISTS factories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(128) UNIQUE NOT NULL,
  renk       VARCHAR(32) DEFAULT '#0d2240',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departmanlar
CREATE TABLE IF NOT EXISTS departments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES factories(id) ON DELETE CASCADE,
  name       VARCHAR(128) NOT NULL,
  renk       VARCHAR(32) DEFAULT '#0d2240',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(factory_id, name)
);

-- Bölgeler / Alanlar
CREATE TABLE IF NOT EXISTS areas (
  id          VARCHAR(64) PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  dept        VARCHAR(128) DEFAULT '',
  alt_dept    VARCHAR(128) DEFAULT '',
  fabrika     VARCHAR(128) DEFAULT '',
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Denetimler
CREATE TABLE IF NOT EXISTS audits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id       VARCHAR(64) REFERENCES areas(id) ON DELETE SET NULL,
  area_name     VARCHAR(128) DEFAULT '',
  auditor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  auditor_name  VARCHAR(128) DEFAULT '',
  date          DATE NOT NULL,
  shift         VARCHAR(16) DEFAULT '',
  total_score   INTEGER DEFAULT 0,
  pillars_json  JSONB DEFAULT '{}',
  answers_json  JSONB DEFAULT '{}',
  notes_json    JSONB DEFAULT '{}',
  photos_json   JSONB DEFAULT '{}',
  status        VARCHAR(32) DEFAULT 'tamamlandi' CHECK (status IN ('tamamlandi','taslak','iptal')),
  form_code     VARCHAR(64) DEFAULT '',
  location      VARCHAR(128) DEFAULT '',
  team_leader   VARCHAR(128) DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Aksiyonlar
CREATE TABLE IF NOT EXISTS actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id     UUID REFERENCES audits(id) ON DELETE SET NULL,
  area_id      VARCHAR(64) REFERENCES areas(id) ON DELETE SET NULL,
  area_name    VARCHAR(128) DEFAULT '',
  description  TEXT NOT NULL,
  assigned_to  VARCHAR(128) DEFAULT '',
  due_date     DATE,
  status       VARCHAR(32) DEFAULT 'Açık' CHECK (status IN ('Açık','Devam Ediyor','Tamamlandı','İptal')),
  priority     VARCHAR(16) DEFAULT 'Orta' CHECK (priority IN ('Düşük','Orta','Yüksek','Kritik')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Denetim Planları (atamalar)
CREATE TABLE IF NOT EXISTS audit_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id          VARCHAR(64) REFERENCES areas(id) ON DELETE CASCADE,
  area_name        VARCHAR(128) DEFAULT '',
  auditor_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  auditor_name     VARCHAR(128) DEFAULT '',
  planned_date     DATE NOT NULL,
  shift            VARCHAR(16) DEFAULT '',
  status           VARCHAR(32) DEFAULT 'Bekliyor' CHECK (status IN ('Bekliyor','Devam Ediyor','Tamamlandı','İptal')),
  form_template_id VARCHAR(64) DEFAULT 'default',
  completed_audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- İNDEKSLER
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audits_area_id    ON audits(area_id);
CREATE INDEX IF NOT EXISTS idx_audits_auditor_id ON audits(auditor_id);
CREATE INDEX IF NOT EXISTS idx_audits_date       ON audits(date DESC);
CREATE INDEX IF NOT EXISTS idx_audits_status     ON audits(status);
CREATE INDEX IF NOT EXISTS idx_actions_audit_id  ON actions(audit_id);
CREATE INDEX IF NOT EXISTS idx_actions_status    ON actions(status);
CREATE INDEX IF NOT EXISTS idx_plans_auditor_id  ON audit_plans(auditor_id);
CREATE INDEX IF NOT EXISTS idx_plans_status      ON audit_plans(status);

-- ============================================================
-- TIMESTAMP OTOMATİK GÜNCELLEME
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_users_updated_at') THEN
    CREATE TRIGGER trg_users_updated_at   BEFORE UPDATE ON users   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_areas_updated_at') THEN
    CREATE TRIGGER trg_areas_updated_at   BEFORE UPDATE ON areas   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_audits_updated_at') THEN
    CREATE TRIGGER trg_audits_updated_at  BEFORE UPDATE ON audits  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_actions_updated_at') THEN
    CREATE TRIGGER trg_actions_updated_at BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_plans_updated_at') THEN
    CREATE TRIGGER trg_plans_updated_at   BEFORE UPDATE ON audit_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
