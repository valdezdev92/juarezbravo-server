-- JuarezBravo.com — Migración inicial MySQL
-- Ejecutar una vez en el servidor de Hostinger

CREATE TABLE IF NOT EXISTS articles (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  title        VARCHAR(500) NOT NULL,
  slug         VARCHAR(500) UNIQUE,
  excerpt      TEXT,
  body         LONGTEXT,
  cover_image  VARCHAR(1000),
  category     ENUM('seguridad','politica','sociedad','deportes','entretenimiento'),
  tags         JSON,
  status       ENUM('draft','published') NOT NULL DEFAULT 'draft',
  is_breaking_news TINYINT(1) NOT NULL DEFAULT 0,
  is_featured  TINYINT(1)   NOT NULL DEFAULT 0,
  author       VARCHAR(255),
  published_at DATETIME,
  views        INT          NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY ft_search (title, excerpt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS breaking_news_ticker (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  headline   VARCHAR(500) NOT NULL,
  url        VARCHAR(1000),
  `order`    INT          NOT NULL DEFAULT 0,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
