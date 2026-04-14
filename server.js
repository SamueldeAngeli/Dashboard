// server.js — API do dashboard (roda no Render)
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const app     = express();

const PORT    = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'nexusgg-dev';

app.use(express.json());

// ── CORS ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Auth ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  if (req.headers['authorization'] !== API_KEY)
    return res.status(401).json({ erro: 'Não autorizado.' });
  next();
};

// ── Estado em memória ─────────────────────────────────────────────
// Todos os dados do bot ficam aqui após cada sync
const STATE = {
  farm:          {},   // { userId: { nome, sujo, comp, droga, acao, livre } }
  caixa:         { sujo: 0, limpo: 0, auditoria: [] },
  bau:           { itens: {}, auditoria: [] },
  compras:       [],   // array de compras da liderança
  encomendas:    [],   // array de encomendas registradas
  acoes:         [],   // array de ações/guerras
  registros:     {},   // { userId: { nome, id, tel, rec } }
  recrutamentos: [],   // array de avaliações de recrutamento
  lastSync:      null,
};

// ── GET /api/farm — dashboard lê tudo ────────────────────────────
app.get('/api/farm', auth, (req, res) => {
  res.json({
    ...STATE,
    meta: {
      dinheiroSujo: 100000,
      componentes:  5000,
      convLimpo:    0.5,
    },
    timestamp: STATE.lastSync,
  });
});

// ── POST /api/sync — bot envia estado completo ────────────────────
// O bot chama isso após qualquer mudança relevante
app.post('/api/sync', auth, (req, res) => {
  const { tipo, dados } = req.body;

  if (!tipo || !dados) {
    return res.status(400).json({ erro: 'Envie { tipo, dados }' });
  }

  // Atualiza apenas o campo que mudou
  switch (tipo) {
    case 'farm':          STATE.farm          = dados; break;
    case 'caixa':         STATE.caixa         = dados; break;
    case 'bau':           STATE.bau           = dados; break;
    case 'compras':       STATE.compras       = dados; break;
    case 'encomendas':    STATE.encomendas    = dados; break;
    case 'acoes':         STATE.acoes         = dados; break;
    case 'registros':     STATE.registros     = dados; break;
    case 'recrutamentos': STATE.recrutamentos = dados; break;
    case 'full':          Object.assign(STATE, dados); break;
    default:
      return res.status(400).json({ erro: `Tipo desconhecido: ${tipo}` });
  }

  STATE.lastSync = Date.now();
  console.log(`[SYNC] ${tipo} atualizado`);
  res.json({ ok: true });
});

// ── POST /api/reset — reseta o farm ──────────────────────────────
app.post('/api/reset', auth, (req, res) => {
  if (req.body?.confirmar !== true)
    return res.status(400).json({ erro: 'Envie { "confirmar": true }' });

  STATE.farm     = {};
  STATE.lastSync = Date.now();
  console.log('[RESET] Farm zerado via dashboard.');
  res.json({ ok: true });
});

// ── Serve o HTML na raiz ──────────────────────────────────────────
app.get('/', (req, res) => {
  const f = path.join(__dirname, 'painel-farm.html');
  if (fs.existsSync(f)) return res.sendFile(f);
  res.send('Suba o painel-farm.html junto com este server.js.');
});

app.listen(PORT, () => {
  console.log(`[DASHBOARD] Rodando na porta ${PORT}`);
  console.log(`[DASHBOARD] API Key: ${API_KEY}`);
});
