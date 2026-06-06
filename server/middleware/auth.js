import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  // API key estática para el scraper (server-to-server)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.SCRAPER_API_KEY) {
    req.user = { username: 'scraper', role: 'scraper' };
    return next();
  }

  // JWT para el panel admin
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
