-- JuarezBravo.com — Estado del scraper interno
-- Ejecutar una vez en phpMyAdmin

-- Historial de runs del scraper (para tracking + lock distribuido)
CREATE TABLE IF NOT EXISTS scraper_runs (
  id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source          ENUM('server','github') NOT NULL DEFAULT 'server',
  scheduled_at    DATETIME     NOT NULL,
  started_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at     DATETIME     NULL,
  status          ENUM('running','success','error') NOT NULL DEFAULT 'running',
  published_count INT          NOT NULL DEFAULT 0,
  skipped_count   INT          NOT NULL DEFAULT 0,
  error_count     INT          NOT NULL DEFAULT 0,
  error_message   TEXT         NULL,
  UNIQUE KEY uk_scheduled_source (scheduled_at, source),
  INDEX idx_started (started_at),
  INDEX idx_status_started (status, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- URLs ya procesadas (independientemente del éxito de la publicación)
CREATE TABLE IF NOT EXISTS scraper_processed_urls (
  url           VARCHAR(1000) NOT NULL,
  url_hash      CHAR(64)      NOT NULL,
  processed_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (url_hash),
  INDEX idx_processed (processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
