// server.js — API do painel (roda no Render)
// O bot envia os dados via POST, o painel lê via GET
const express = require('express');
const app     = express();

const PORT   = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'nexusgg-dev';

app.use(express.json());

// ── Dados em memória (sem arquivo, sem disco) ─────────────────
let farmData = {};
let lastUpdate = null;

// ── CORS — permite o painel acessar de qualquer origem ────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Auth ──────────────────────────────────────────────────────
function autenticar(req, res, next) {
  if (req.headers['authorization'] !== API_KEY) {
    return res.status(401).json({ erro: 'Não autorizado.' });
  }
  next();
}

// ── GET /api/farm — painel lê os dados ───────────────────────
app.get('/api/farm', autenticar, (req, res) => {
  res.json({
    farm:      farmData,
    meta:      { dinheiroSujo: 100000, componentes: 5000, convLimpo: 0.5 },
    timestamp: lastUpdate,
  });
});

// ── POST /api/sync — bot envia os dados ──────────────────────
app.post('/api/sync', autenticar, (req, res) => {
  const { farm } = req.body;
  if (!farm || typeof farm !== 'object') {
    return res.status(400).json({ erro: 'Envie { farm: { ... } }' });
  }
  farmData   = farm;
  lastUpdate = Date.now();
  console.log(`[SYNC] Farm atualizado — ${Object.keys(farm).length} membros`);
  res.json({ ok: true });
});

// ── POST /api/reset — painel reseta o farm ───────────────────
app.post('/api/reset', autenticar, (req, res) => {
  if (req.body?.confirmar !== true) {
    return res.status(400).json({ erro: 'Envie { "confirmar": true }' });
  }
  farmData   = {};
  lastUpdate = Date.now();
  console.log('[RESET] Farm zerado via painel.');
  res.json({ ok: true, mensagem: 'Farm resetado.' });
});

// ── Serve o painel HTML na raiz ───────────────────────────────
const path = require('path');
app.get('/', (req, res) => {
  const f = path.join(__dirname, 'painel-farm.html');
  const fs = require('fs');
  if (fs.existsSync(f)) return res.sendFile(f);
  res.send('Painel não encontrado. Suba o painel-farm.html junto com este server.js.');
});

app.listen(PORT, () => {
  console.log(`[PAINEL] Rodando na porta ${PORT}`);
  console.log(`[PAINEL] API Key: ${API_KEY}`);
});
