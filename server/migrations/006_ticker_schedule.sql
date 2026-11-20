-- Aplicar antes de desplegar el panel de Última hora. Las fechas se guardan en UTC.
ALTER TABLE breaking_news_ticker
  ADD COLUMN starts_at DATETIME NULL,
  ADD COLUMN ends_at DATETIME NULL,
  ADD COLUMN article_id VARCHAR(36) NULL,
  ADD INDEX idx_ticker_active_order (is_active, `order`);
