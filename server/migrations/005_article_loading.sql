-- Ejecutar UNA VEZ, antes de desplegar el código que usa MATCH(title, excerpt, body).
-- Los índices aceleran portada, categorías, hero y listados administrativos.
CREATE INDEX idx_articles_status_date ON articles (status, published_at, id);
CREATE INDEX idx_articles_category_date ON articles (status, category, published_at, id);
CREATE INDEX idx_articles_featured_date ON articles (status, is_featured, published_at, id);
CREATE INDEX idx_articles_created ON articles (created_at, id);
CREATE FULLTEXT INDEX ft_article_content ON articles (title, excerpt, body);
