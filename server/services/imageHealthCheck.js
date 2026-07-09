/**
 * Revisa las notas publicadas hoy y despublica las que tengan la imagen de
 * portada rota (fuentes externas hotlinked se caen o cambian de URL después
 * de publicadas) — mejor una nota sin publicar que un hueco sin imagen en
 * portada.
 */
import db from '../db.js';
import { isImageUrlValid } from './imageCheck.js';

export async function runImageHealthCheck() {
  const [rows] = await db.query(
    `SELECT id, title, cover_image FROM articles
      WHERE status = 'published'
        AND cover_image IS NOT NULL AND cover_image != ''
        AND DATE(published_at) = CURDATE()`
  );

  const counts = { checked: 0, removed: 0 };

  for (const row of rows) {
    counts.checked++;
    if (await isImageUrlValid(row.cover_image)) continue;

    await db.query(
      `UPDATE articles SET status = 'draft', is_featured = 0, featured_until = NULL WHERE id = ?`,
      [row.id]
    );
    counts.removed++;
    console.warn(`[ImageHealth] ○ Imagen rota, se despublica: "${(row.title || '').slice(0, 70)}"`);
  }

  return counts;
}
