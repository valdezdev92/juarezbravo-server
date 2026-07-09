-- JuarezBravo.com — Chequeo periódico de imágenes rotas
-- Ejecutar una vez en phpMyAdmin

-- Historial de runs del chequeo de imágenes (para tracking + lock distribuido,
-- igual que scraper_runs)
CREATE TABLE IF NOT EXISTS image_health_runs (
  id            INT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scheduled_at  DATETIME  NOT NULL,
  started_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at   DATETIME  NULL,
  status        ENUM('running','success','error') NOT NULL DEFAULT 'running',
  checked_count INT       NOT NULL DEFAULT 0,
  removed_count INT       NOT NULL DEFAULT 0,
  error_message TEXT      NULL,
  UNIQUE KEY uk_scheduled (scheduled_at),
  INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
