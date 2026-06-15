import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import articlesRouter from './routes/articles.js';
import tickerRouter   from './routes/ticker.js';
import authRouter     from './routes/auth.js';
import uploadRouter   from './routes/upload.js';
import scraperRouter  from './routes/scraper.js';
import { startScraperScheduler } from './services/scraperScheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/ticker',   tickerRouter);
app.use('/api/upload',   uploadRouter);
app.use('/api/scraper',  scraperRouter);

// ── Archivos subidos (imágenes) ───────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── React SPA (producción) ────────────────────────────────────────────────────
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ JuarezBravo server corriendo en http://localhost:${PORT}`);
  startScraperScheduler();
});
