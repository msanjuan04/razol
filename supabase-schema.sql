-- =============================================
-- Razol Parquet — Tabla de leads con embudo inteligente
-- Ejecutar en: Supabase → SQL Editor → New Query
-- =============================================

CREATE TABLE IF NOT EXISTS leads (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Datos de contacto
  nombre        TEXT        NOT NULL,
  telefono      TEXT        NOT NULL,
  email         TEXT,
  zona          TEXT        NOT NULL,
  mensaje       TEXT,

  -- Opciones seleccionadas en el formulario
  servicio      TEXT        NOT NULL,
  metros        TEXT        NOT NULL,
  plazo         TEXT        NOT NULL,
  tipo_perfil   TEXT        CHECK (tipo_perfil IN ('Particular', 'Interiorista', 'Arquitecto / Constructor')),

  -- Scoring del embudo inteligente
  puntos_servicio  INTEGER  NOT NULL,
  puntos_metros    INTEGER  NOT NULL,
  puntos_plazo     INTEGER  NOT NULL,
  puntos_email     INTEGER  NOT NULL DEFAULT 0,
  puntos_perfil    INTEGER  NOT NULL DEFAULT 0,
  puntuacion_total INTEGER  NOT NULL,  -- máximo 14 pts
  calificacion     TEXT     NOT NULL CHECK (calificacion IN ('CALIENTE', 'TEMPLADO', 'FRIO'))
);

-- Índices útiles para filtrar en el dashboard admin
CREATE INDEX IF NOT EXISTS idx_leads_calificacion  ON leads (calificacion);
CREATE INDEX IF NOT EXISTS idx_leads_created_at    ON leads (created_at DESC);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- El formulario (clave anon) puede insertar
CREATE POLICY "Inserts desde formulario" ON leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- El service_role (backend) puede leer todo
CREATE POLICY "Service role puede leer" ON leads
  FOR SELECT TO service_role
  USING (true);

-- =============================================
-- MIGRACIÓN: añadir columnas de perfil
-- Ejecutar solo si la tabla ya existía antes
-- =============================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS tipo_perfil   TEXT CHECK (tipo_perfil IN ('Particular', 'Interiorista', 'Arquitecto / Constructor')),
  ADD COLUMN IF NOT EXISTS puntos_perfil INTEGER NOT NULL DEFAULT 0;
