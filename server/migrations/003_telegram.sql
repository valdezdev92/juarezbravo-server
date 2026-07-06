-- JuarezBravo.com — Bot de Telegram (sesiones + duración del hero)
-- Ejecutar una vez en phpMyAdmin

-- Sesiones conversacionales del bot, persistidas en DB porque puede haber
-- varias instancias del servidor Node corriendo simultáneamente (Passenger).
CREATE TABLE IF NOT EXISTS telegram_sessions (
  chat_id    VARCHAR(50) NOT NULL PRIMARY KEY,
  step       VARCHAR(50) NOT NULL DEFAULT 'idle',
  data       JSON        NOT NULL,
  updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Duración del hero: NULL = sin límite (permanente) o hero no asignado.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS featured_until DATETIME NULL AFTER is_featured;
