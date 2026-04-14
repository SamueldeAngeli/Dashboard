// server.js — Mini servidor web para o painel de farm
// Rode com: node server.js
// Acesse:   http://SEU_IP:3000

const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const app      = express();

// ── Config ────────────────────────────────────────────────────
const PORT       = process.env.PORT || 3000;
const PATH_FARM  = path.join(__dirname, 'database', 'farm.json');
const PATH_CONFIG = path.join(__dirname, 'config.json');
const PANEL_HTML = path.join(__dirname, 'painel-farm.html');

// Chave de segurança simples (defina no .env como API_KEY=suachave)
// O painel envia esta chave no header Authorization
const API_KEY = process.env.API_KEY || 'nexusgg-dev';

app.use(express.json());

// Serve o HTML do painel na raiz
app.get('/', (req, res) => {
  if (!fs.existsSync(PANEL_HTML)) {
    return res.status(404).send('painel-farm.html não encontrado na pasta do bot.');
  }
  res.sendFile(PANEL_HTML);
});

// ── Middleware de autenticação ────────────────────────────────
function autenticar(req, res, next) {
  const chave = req.headers['authorization'];
  if (chave !== API_KEY) {
    return res.status(401).json({ erro: 'Não autorizado.' });
  }
  next();
}

// ── GET /api/farm — retorna dados de farm + config ────────────
app.get('/api/farm', autenticar, (req, res) => {
  try {
    const farm   = fs.existsSync(PATH_FARM)   ? JSON.parse(fs.readFileSync(PATH_FARM,   'utf8')) : {};
    const config = fs.existsSync(PATH_CONFIG) ? JSON.parse(fs.readFileSync(PATH_CONFIG, 'utf8')) : {};

    res.json({
      farm,
      meta: {
        dinheiroSujo: 100000,
        componentes:  5000,
      },
      timestamp: Date.now(),
    });
  } catch (e) {
    console.error('[API] Erro ao ler farm.json:', e.message);
    res.status(500).json({ erro: 'Erro ao ler dados.' });
  }
});

// ── POST /api/reset — reseta o farm (requer confirmação) ──────
app.post('/api/reset', autenticar, (req, res) => {
  const { confirmar } = req.body;
  if (confirmar !== true) {
    return res.status(400).json({ erro: 'Envie { "confirmar": true } para resetar.' });
  }

  try {
    fs.writeFileSync(PATH_FARM, JSON.stringify({}, null, 2), 'utf8');
    console.log('[API] Farm resetado via painel.');
    res.json({ ok: true, mensagem: 'Farm resetado com sucesso.' });
  } catch (e) {
    console.error('[API] Erro ao resetar farm:', e.message);
    res.status(500).json({ erro: 'Erro ao resetar farm.' });
  }
});

// ── Inicia o servidor ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[PAINEL] Servidor rodando em http://localhost:${PORT}`);
  console.log(`[PAINEL] API Key: ${API_KEY}`);
  console.log(`[PAINEL] Acesse o painel em http://SEU_IP:${PORT}`);
});
