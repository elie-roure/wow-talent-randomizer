import fs from 'fs';
import path from 'path';
import express from 'express';
import { config } from './config';
import healthRouter from './routes/health';
import apiRouter from './routes/api';

const app = express();

app.use(express.json());

app.use('/health', healthRouter);
app.use('/api', apiRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// In production the built client is served by the same server (single-page app).
const indexHtml = path.join(config.publicDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(config.publicDir));
  app.get('*', (_req, res) => res.sendFile(indexHtml));
}

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

export default app;
