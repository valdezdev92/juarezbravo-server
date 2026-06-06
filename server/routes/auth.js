import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  if (username !== process.env.ADMIN_USER) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  let valid = false;
  try {
    valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  } catch {
    return res.status(500).json({ error: 'Error interno' });
  }

  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: { username, role: 'admin', full_name: 'Administrador' },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    username: req.user.username,
    role: req.user.role,
    full_name: 'Administrador',
  });
});

export default router;
